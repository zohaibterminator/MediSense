import { useState } from "react";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { useToast } from "@/hooks/use-toast";

interface NewChatDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onChatCreated: (chatId: string) => void; // Changed prop name and type
}

export const NewChatDialog = ({
  open,
  onOpenChange,
  onChatCreated, // Updated prop name
}: NewChatDialogProps) => {
  const [chatName, setChatName] = useState("");
  const [isLoading, setIsLoading] = useState(false);
  const { toast } = useToast();

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!chatName.trim()) return;

    setIsLoading(true);
    try {
      const userId = localStorage.getItem('userId');
      if (!userId) {
        throw new Error('User not authenticated');
      }

      const response = await fetch('${process.env.BACKEND_URL}/chat/create', { // Fixed endpoint
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          title: chatName,
          user_id: userId,
        }),
      });

      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.detail || 'Failed to create chat');
      }

      const data = await response.json();
      onChatCreated(data.id); // Pass only the chat ID
      setChatName("");
      toast({
        title: "Chat created",
        description: `"${chatName}" has been created successfully`,
      });
      onOpenChange(false);

    } catch (error) {
      toast({
        title: "Error creating chat",
        description: error instanceof Error ? error.message : 'An unknown error occurred',
        variant: "destructive",
      });
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-[425px]">
        <DialogHeader>
          <DialogTitle>Create New Chat</DialogTitle>
        </DialogHeader>
        <form onSubmit={handleSubmit} className="space-y-4">
          <Input
            value={chatName}
            onChange={(e) => setChatName(e.target.value)}
            placeholder="Enter chat name..."
            className="w-full"
            required
          />
          <div className="flex justify-end gap-2">
            <Button
              type="button"
              variant="outline"
              onClick={() => {
                setChatName("");
                onOpenChange(false);
              }}
              disabled={isLoading}
            >
              Cancel
            </Button>
            <Button 
              type="submit" 
              disabled={!chatName.trim() || isLoading}
            >
              {isLoading ? "Creating..." : "Create"}
            </Button>
          </div>
        </form>
      </DialogContent>
    </Dialog>
  );
};