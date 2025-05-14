import { useState, useRef, useEffect } from "react";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Image, Send, Paperclip, Bot, User, X } from "lucide-react";
import { useToast } from "@/hooks/use-toast";
import ReactMarkdown from 'react-markdown';
import remarkGfm from 'remark-gfm';

interface Message {
  id: string;
  content: string;
  role: "user" | "assistant";
  timestamp: Date;
  attachments?: { type: string; url: string; name: string }[];
}

interface ChatContainerProps {
  chatId: string;
  messages: Message[];
  isLoading?: boolean;
}

export const ChatContainer = ({ 
  chatId, 
  messages: initialMessages, 
  isLoading: isParentLoading = false 
}: ChatContainerProps) => {
  const [localMessages, setLocalMessages] = useState<Message[]>(initialMessages);
  const [input, setInput] = useState("");
  const [isSending, setIsSending] = useState(false);
  const [attachments, setAttachments] = useState<File[]>([]);
  const messagesEndRef = useRef<HTMLDivElement>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const { toast } = useToast();

  // Sync local messages with parent messages
  useEffect(() => {
    setLocalMessages(initialMessages);
  }, [initialMessages]);

  const scrollToBottom = () => {
    messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
  };

  useEffect(() => {
    scrollToBottom();
  }, [localMessages]);

  const saveAssistantMessage = async (content: string) => {
    try {
      const response = await fetch(`${import.meta.env.VITE_BACKEND_URL}/chat/${chatId}/add_message`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          content: content,
          role: "assistant"
        }),
      });

      if (!response.ok) {
        throw new Error('Failed to save assistant message');
      }
    } catch (error) {
      console.error('Error saving assistant message:', error);
    }
  };

  const parsePdfOnBackend = async (file: File): Promise<string> => {
    const formData = new FormData();
    formData.append("file", file);

    try {
      setIsSending(true);
      toast({
        title: "Processing",
        description: "Analyzing lab report...",
      });

      const response = await fetch(`${import.meta.env.VITE_BACKEND_URL}/chat/parse-pdf`, {
        method: "POST",
        body: formData,
      });

      if (!response.ok) {
        throw new Error("Failed to parse PDF");
      }

      const data = await response.json();
      const parsedContent = data.text.pages.map(page => page.md).join("\n\n");
      return parsedContent;
    } catch (error) {
      toast({
        title: "Error",
        description: error instanceof Error ? error.message : 'Failed to parse lab report',
        variant: "destructive",
      });
      throw error;
    } finally {
      setIsSending(false);
    }
  };

  const handleImageAnalysis = async (file: File, userPrompt: string) => {
    const assistantMessageId = `assistant-${Date.now()}`;
    let fullResponse = "";

    try {
      setIsSending(true);
      
      // Create user message with image preview
      const imageUrl = URL.createObjectURL(file);
      const userMessage: Message = {
        id: `user-${Date.now()}`,
        content: userPrompt || "Image uploaded for analysis",
        role: "user",
        timestamp: new Date(),
        attachments: [{
          type: "image",
          url: imageUrl,
          name: file.name
        }]
      };
      setLocalMessages(prev => [...prev, userMessage]);

      // Create placeholder assistant message
      const assistantMessage: Message = {
        id: assistantMessageId,
        content: "",
        role: "assistant",
        timestamp: new Date(),
      };
      setLocalMessages(prev => [...prev, assistantMessage]);

      const formData = new FormData();
      formData.append("message", userPrompt);
      formData.append("file", file);

      const response = await fetch(
        `${import.meta.env.VITE_BACKEND_URL}/images/${chatId}/infer/image`,
        {
          method: "POST",
          body: formData,
        }
      );

      if (!response.ok || !response.body) {
        throw new Error('Failed to analyze image');
      }

      const reader = response.body.getReader();
      const decoder = new TextDecoder('utf-8');

      while (true) {
        const { done, value } = await reader.read();
        if (done) break;

        const chunk = decoder.decode(value, { stream: true });
        const lines = chunk.split("\n\n").filter(Boolean);

        for (const line of lines) {
          if (line.startsWith("data: ")) {
            let text = line.replace("data: ", "");

            if (text === "###" && fullResponse != ""){
              text = '\n\n' + text; // Accumulate the full response
            } else if (text.endsWith("|")) {
              text = text.replace("|", "\n\n");
            }
            fullResponse += text;
            setLocalMessages(prev => {
              const updated = [...prev];
              const lastMessage = updated[updated.length - 1];
              if (lastMessage.id === assistantMessageId) {
                lastMessage.content += text;
              }
              return updated;
            });
          }
        }
      }

      await saveAssistantMessage(fullResponse);
    } catch (error) {
      toast({
        title: "Error",
        description: error instanceof Error ? error.message : 'Failed to analyze image',
        variant: "destructive",
      });
      setLocalMessages(prev => prev.filter(msg => msg.id !== assistantMessageId));
    } finally {
      setIsSending(false);
    }
  };

  const handleSend = async () => {
    if (!input.trim() && attachments.length === 0) return;

    const pdfFiles = attachments.filter(file => file.type === "application/pdf");
    const imageFiles = attachments.filter(file => file.type.startsWith("image/"));
    const otherFiles = attachments.filter(file => 
      !file.type.startsWith("image/") && file.type !== "application/pdf"
    );
    
    let parsedPdfContent = "";
    if (pdfFiles.length > 0) {
      try {
        setIsSending(true);
        toast({
          title: "Processing",
          description: "Parsing lab reports...",
        });

        const parsedContents = await Promise.all(
          pdfFiles.map(file => parsePdfOnBackend(file))
        );
        parsedPdfContent = parsedContents.join("\n\n---\n\n");
      } catch (error) {
        setIsSending(false);
        return;
      }
    }

    // Handle image attachments with the user's prompt
    if (imageFiles.length > 0) {
      imageFiles.forEach(file => handleImageAnalysis(file, input));
      setAttachments(otherFiles); // Keep only non-image files
      if (otherFiles.length === 0) {
        setInput("");
        return;
      }
    }

    const attachmentUrls = await Promise.all(
      otherFiles.map(async (file) => {
        const url = URL.createObjectURL(file);
        return {
          type: "file",
          url,
          name: file.name,
        };
      })
    );

    const fullContent = [
      input,
      ...(parsedPdfContent ? [`LAB REPORT ANALYSIS:\n${parsedPdfContent}`] : [])
    ].filter(Boolean).join("\n\n");

    const userMessage: Message = {
      id: `user-${Date.now()}`,
      content: input,
      role: "user",
      timestamp: new Date(),
      attachments: attachmentUrls,
    };

    setLocalMessages(prev => [...prev, userMessage]);
    setInput("");
    setAttachments([]);
    setIsSending(true);

    const assistantMessageId = `assistant-${Date.now()}`;
    let fullResponse = "";
    
    try {
      const assistantMessage: Message = {
        id: assistantMessageId,
        content: "",
        role: "assistant",
        timestamp: new Date(),
      };

      setLocalMessages(prev => [...prev, assistantMessage]);

      const response = await fetch(`${import.meta.env.VITE_BACKEND_URL}/chat/${chatId}/infer`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          content: fullContent,
          role: "user",
        }),
      });

      if (!response.ok || !response.body) {
        throw new Error('Failed to get response from LLM');
      }

      const reader = response.body.getReader();
      const decoder = new TextDecoder('utf-8');

      while (true) {
        const { done, value } = await reader.read();
        if (done) break;

        const chunk = decoder.decode(value, { stream: true });
        const lines = chunk.split("\n\n").filter(Boolean);

        for (const line of lines) {
          if (line.startsWith("data: ")) {
            let text = line.replace("data: ", "");

            if (text === "###" && fullResponse != ""){
              text = '\n\n' + text; // Accumulate the full response
            } else if (text.endsWith("|")) {
              text = text.replace("|", "\n\n");
            }
            fullResponse += text;
            setLocalMessages(prev => {
              const updated = [...prev];
              const lastMessage = updated[updated.length - 1];
              if (lastMessage.id === assistantMessageId) {
                lastMessage.content += text;
              }
              return updated;
            });
          }
        }
      }

      // After streaming completes, save the full response
      await saveAssistantMessage(fullResponse);

    } catch (error) {
      toast({
        title: "Error",
        description: error instanceof Error ? error.message : 'Failed to get response from AI',
        variant: "destructive",
      });
      setLocalMessages(prev => prev.filter(msg => msg.id !== assistantMessageId));
    } finally {
      setIsSending(false);
    }
  };

  const handleFileUpload = (event: React.ChangeEvent<HTMLInputElement>) => {
    const files = event.target.files;
    if (!files) return;

    const newFiles = Array.from(files);
    setAttachments(prev => [...prev, ...newFiles]);
    
    toast({
      title: "Files attached",
      description: `${newFiles.length} file(s) attached. Add your prompt and click send.`,
    });
  };

  const removeAttachment = (index: number) => {
    setAttachments(prev => prev.filter((_, i) => i !== index));
  };

  return (
    <div className="flex-1 flex flex-col">
      {isParentLoading ? (
        <div className="flex-1 flex items-center justify-center">
          <div className="animate-spin rounded-full h-8 w-8 border-2 border-primary border-t-transparent" />
        </div>
      ) : (
        <>
          <ScrollArea className="flex-1 p-4">
            <div className="space-y-4">
              {localMessages.map((message) => (
                <div 
                  key={message.id}
                  className={`flex gap-3 p-4 rounded-lg ${
                    message.role === "user" 
                      ? "bg-gray-100 dark:bg-gray-800" 
                      : "bg-blue-50 dark:bg-blue-900"
                  }`}
                  style={{ maxWidth: 'calc(100vw - 2rem)' }}
                >
                  <div className="h-8 w-8 rounded-full flex items-center justify-center">
                    {message.role === "user" ? (
                      <User className="h-4 w-4" />
                    ) : (
                      <Bot className="h-4 w-4" />
                    )}
                  </div>
                  <div className="flex-1 min-w-0">
                    <div className="text-sm text-muted-foreground">
                      {message.timestamp.toLocaleTimeString()}
                    </div>
                    <div className="mt-1 max-w-full overflow-hidden">
                      {message.role === "assistant" ? (
                        <ReactMarkdown
                          remarkPlugins={[remarkGfm]}
                          components={{
                            h1: ({node, ...props}) => <h2 className="text-xl font-bold mt-4 mb-2" {...props} />,
                            h2: ({node, ...props}) => <h3 className="text-lg font-semibold mt-3 mb-1.5" {...props} />,
                            h3: ({node, ...props}) => <h4 className="text-md font-medium mt-2 mb-1" {...props} />,
                            p: ({node, ...props}) => <p className="mb-2" {...props} />,
                            ul: ({node, ...props}) => <ul className="list-disc pl-5 mb-3" {...props} />,
                            ol: ({node, ...props}) => <ol className="list-decimal pl-5 mb-3" {...props} />,
                            li: ({node, ...props}) => <li className="mb-1" {...props} />,
                            table: ({node, ...props}) => (
                              <div className="overflow-auto my-2">
                                <table className="border-collapse w-full" {...props} />
                              </div>
                            ),
                            th: ({node, ...props}) => (
                              <th className="border px-4 py-2 text-left bg-gray-100 dark:bg-gray-700" {...props} />
                            ),
                            td: ({node, ...props}) => (
                              <td className="border px-4 py-2" {...props} />
                            ),
                            strong: ({node, ...props}) => (
                              <strong className="font-semibold" {...props} />
                            ),
                            em: ({node, ...props}) => (
                              <em className="italic" {...props} />
                            ),
                          }}
                        >
                          {message.content.replace(/\\n/g, '\n')}
                        </ReactMarkdown>
                      ) : (
                        <div className="mt-1 whitespace-pre-wrap break-words">{message.content}</div>
                      )}
                    </div>
                    {message.attachments?.map((attachment, index) => (
                      <div key={index} className="mt-2">
                        {attachment.type === "image" ? (
                          <div className="relative group">
                            <img
                              src={attachment.url}
                              alt={attachment.name}
                              className="max-h-64 max-w-full rounded-lg object-contain border"
                            />
                            <div className="absolute bottom-2 right-2 bg-black/50 text-white text-xs px-2 py-1 rounded">
                              {attachment.name}
                            </div>
                          </div>
                        ) : (
                          <a
                            href={attachment.url}
                            target="_blank"
                            rel="noopener noreferrer"
                            className="flex items-center gap-2 text-primary hover:underline"
                          >
                            <Paperclip className="h-4 w-4" />
                            {attachment.name}
                          </a>
                        )}
                      </div>
                    ))}
                  </div>
                </div>
              ))}
              <div ref={messagesEndRef} />
            </div>
          </ScrollArea>

          <div className="p-4 border-t">
            {attachments.length > 0 && (
              <div className="flex flex-wrap gap-2 mb-2">
                {attachments.map((file, index) => (
                  <div
                    key={index}
                    className="flex items-center gap-2 bg-secondary/50 rounded-lg px-2 py-1"
                  >
                    <span className="text-sm truncate max-w-[200px]">
                      {file.name}
                    </span>
                    <Button
                      variant="ghost"
                      size="icon"
                      className="h-5 w-5"
                      onClick={() => removeAttachment(index)}
                    >
                      <X className="h-3 w-3" />
                    </Button>
                  </div>
                ))}
              </div>
            )}
            <div className="flex gap-2">
              <Button
                variant="outline"
                size="icon"
                onClick={() => fileInputRef.current?.click()}
              >
                <Paperclip className="h-4 w-4" />
              </Button>
              <input
                ref={fileInputRef}
                type="file"
                className="hidden"
                multiple
                onChange={handleFileUpload}
                accept="image/*,.pdf"
              />
              <Textarea
                value={input}
                onChange={(e) => setInput(e.target.value)}
                placeholder="Type your message..."
                className="flex-1"
                onKeyDown={(e) => {
                  if (e.key === "Enter" && !e.shiftKey) {
                    e.preventDefault();
                    handleSend();
                  }
                }}
              />
              <Button
                onClick={handleSend}
                disabled={isSending || (!input.trim() && attachments.length === 0)}
                className="w-24"
              >
                {isSending ? (
                  <div className="animate-spin rounded-full h-4 w-4 border-2 border-primary border-t-transparent" />
                ) : (
                  <>
                    <Send className="h-4 w-4 mr-2" />
                    Send
                  </>
                )}
              </Button>
            </div>
          </div>
        </>
      )}
    </div>
  );
};