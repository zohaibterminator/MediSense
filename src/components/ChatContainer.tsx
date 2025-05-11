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

  // Add this function to save the assistant message
const saveAssistantMessage = async (content: string) => {
  try {
    const response = await fetch(`${import.meta.env.VITE_BACKEND_URL}/chat/${chatId}/add_message`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        content: content,
        role: "assistant" // Changed from "user" to "assistant"
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

    // Extract the most useful information - we'll use the markdown version
    // which is better formatted for the LLM to understand
    const parsedContent = data.text.pages.map(page => page.md).join("\n\n");
    
    // Alternatively, we could extract just the test results table:
    // const testResults = data.text.pages[0].text.match(/Test.*?Normal Ranges[\s\S]*?PLATELETS.*?\n/g)?.[0] || "";
    
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

const handleSend = async () => {
  if (!input.trim() && attachments.length === 0) return;

  const pdfFiles = attachments.filter(file => file.type === "application/pdf");
  const otherFiles = attachments.filter(file => file.type !== "application/pdf");
  
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

  const attachmentUrls = await Promise.all(
    attachments.map(async (file) => {
      const url = URL.createObjectURL(file);
      return {
        type: file.type.startsWith("image/") ? "image" : "file",
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
  let fullResponse = ""; // Track the full response
  
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
    let buffer = "";

    while (true) {
      const { done, value } = await reader.read();
      if (done) break;

      const chunk = decoder.decode(value, { stream: true });
      buffer += chunk;

      // Process complete SSE events
      const events = buffer.split("\n\n").filter(event => event.startsWith("data: "));
      buffer = buffer.split("\n\n").filter(event => !event.startsWith("data: ")).join("\n\n");

      for (const event of events) {
        const text = event.replace("data: ", "").trim();
        if (text) {
          fullResponse += text;
          setLocalMessages(prev => {
            const updated = [...prev];
            const lastMessage = updated[updated.length - 1];
            if (lastMessage.id === assistantMessageId) {
              // Update the entire content to maintain markdown structure
              lastMessage.content = fullResponse;
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
    if (files) {
      const newFiles = Array.from(files);
      setAttachments(prev => [...prev, ...newFiles]);
      toast({
        title: "Files attached",
        description: `${newFiles.length} file(s) attached successfully.`,
      });
    }
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
                >
                  <div className="h-8 w-8 rounded-full flex items-center justify-center">
                    {message.role === "user" ? (
                      <User className="h-4 w-4" />
                    ) : (
                      <Bot className="h-4 w-4" />
                    )}
                  </div>
                  <div className="flex-1">
                    <div className="text-sm text-muted-foreground">
                      {message.timestamp.toLocaleTimeString()}
                    </div>
                    <div className="mt-1">
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
                          {message.content}
                        </ReactMarkdown>
                      ) : (
                        <div className="whitespace-pre-wrap">{message.content}</div>
                      )}
                    </div>
                    {message.attachments?.map((attachment, index) => (
                      <div key={index} className="mt-2">
                        {attachment.type === "image" ? (
                          <img
                            src={attachment.url}
                            alt={attachment.name}
                            className="max-w-xs rounded-lg"
                          />
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