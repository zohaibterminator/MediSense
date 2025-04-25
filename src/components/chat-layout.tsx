"use client";

import { useState } from "react";
import { Button } from "@/components/ui/button";
import { useSession } from "next-auth/react";

export function ChatLayout() {
  const { data: session } = useSession();
  const [messages, setMessages] = useState<Array<{ role: string; content: string }>>([]);

  return (
    <div className="flex h-screen flex-col">
      <header className="border-b p-4">
        <div className="flex items-center justify-between">
          <h1 className="text-xl font-semibold">Chat</h1>
          <div className="flex items-center gap-4">
            <span>{session?.user?.email}</span>
          </div>
        </div>
      </header>
      <main className="flex-1 overflow-auto p-4">
        <div className="space-y-4">
          {messages.map((message, index) => (
            <div
              key={index}
              className={`flex ${
                message.role === "user" ? "justify-end" : "justify-start"
              }`}
            >
              <div
                className={`rounded-lg px-4 py-2 ${
                  message.role === "user"
                    ? "bg-primary text-primary-foreground"
                    : "bg-muted"
                }`}
              >
                {message.content}
              </div>
            </div>
          ))}
        </div>
      </main>
    </div>
  );
}