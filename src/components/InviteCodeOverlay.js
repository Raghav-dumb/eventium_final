"use client";

import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { X, Lock } from "lucide-react";

export default function InviteCodeOverlay({ 
  isOpen, 
  onClose, 
  onSubmit, 
  eventTitle,
  loading = false 
}) {
  const [inviteCode, setInviteCode] = useState("");

  const handleSubmit = (e) => {
    e.preventDefault();
    if (inviteCode.trim()) {
      onSubmit(inviteCode.trim());
    }
  };

  const handleClose = () => {
    setInviteCode("");
    onClose();
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 bg-black/50 backdrop-blur-sm z-50 flex items-center justify-center p-4">
      <Card className="w-full max-w-md mx-4 shadow-2xl border-0">
        <CardHeader className="text-center pb-4">
          <div className="mx-auto w-12 h-12 bg-blue-100 rounded-full flex items-center justify-center mb-4">
            <Lock className="h-6 w-6 text-blue-600" />
          </div>
          <CardTitle className="text-xl font-semibold">Private Event</CardTitle>
          <CardDescription className="text-gray-600">
            This event requires an invite code to join
          </CardDescription>
          {eventTitle && (
            <p className="text-sm font-medium text-gray-800 mt-2">
              "{eventTitle}"
            </p>
          )}
        </CardHeader>
        
        <CardContent>
          <form onSubmit={handleSubmit} className="space-y-4">
            <div className="space-y-2">
              <Label htmlFor="invite-code">Invite Code</Label>
              <Input
                id="invite-code"
                type="text"
                placeholder="Enter your invite code"
                value={inviteCode}
                onChange={(e) => setInviteCode(e.target.value)}
                required
                autoFocus
                className="text-center text-lg font-mono tracking-wider"
              />
            </div>
            
            <div className="flex gap-3 pt-2">
              <Button
                type="button"
                variant="outline"
                onClick={handleClose}
                className="flex-1"
                disabled={loading}
              >
                Cancel
              </Button>
              <Button
                type="submit"
                className="flex-1"
                disabled={loading || !inviteCode.trim()}
              >
                {loading ? "Joining..." : "Join Event"}
              </Button>
            </div>
          </form>
        </CardContent>
        
        <button
          onClick={handleClose}
          className="absolute top-4 right-4 p-2 hover:bg-gray-100 rounded-full transition-colors"
          disabled={loading}
        >
          <X className="h-4 w-4 text-gray-500" />
        </button>
      </Card>
    </div>
  );
}
