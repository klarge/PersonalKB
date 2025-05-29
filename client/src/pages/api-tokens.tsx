import { useState } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { ArrowLeft, Plus, Trash2, Copy, Eye, EyeOff } from "lucide-react";
import { useToast } from "@/hooks/use-toast";
import { apiRequest } from "@/lib/queryClient";
import { Link } from "wouter";
import type { ApiToken } from "@shared/schema";

export default function ApiTokensPage() {
  const [newTokenName, setNewTokenName] = useState("");
  const [showToken, setShowToken] = useState<{[key: number]: boolean}>({});
  const [isCreateDialogOpen, setIsCreateDialogOpen] = useState(false);
  const { toast } = useToast();
  const queryClient = useQueryClient();

  const { data: tokens = [], isLoading } = useQuery<ApiToken[]>({
    queryKey: ["/api/tokens"],
  });

  const createMutation = useMutation({
    mutationFn: async (name: string) => {
      const response = await apiRequest("POST", "/api/tokens", { name });
      return response.json();
    },
    onSuccess: (newToken) => {
      toast({
        title: "API Token Created",
        description: "Your new API token has been generated. Copy it now as it won't be shown again.",
      });
      queryClient.invalidateQueries({ queryKey: ["/api/tokens"] });
      setNewTokenName("");
      setIsCreateDialogOpen(false);
      setShowToken({ [newToken.id]: true });
    },
    onError: () => {
      toast({
        title: "Error",
        description: "Failed to create API token. Please try again.",
        variant: "destructive",
      });
    },
  });

  const deleteMutation = useMutation({
    mutationFn: async (id: number) => {
      await apiRequest("DELETE", `/api/tokens/${id}`);
    },
    onSuccess: () => {
      toast({
        title: "Token Deleted",
        description: "API token has been permanently deleted.",
      });
      queryClient.invalidateQueries({ queryKey: ["/api/tokens"] });
    },
    onError: () => {
      toast({
        title: "Error",
        description: "Failed to delete API token. Please try again.",
        variant: "destructive",
      });
    },
  });

  const copyToClipboard = (token: string) => {
    navigator.clipboard.writeText(token);
    toast({
      title: "Copied",
      description: "API token copied to clipboard.",
    });
  };

  const toggleTokenVisibility = (id: number) => {
    setShowToken(prev => ({ ...prev, [id]: !prev[id] }));
  };

  const handleCreateToken = () => {
    if (newTokenName.trim()) {
      createMutation.mutate(newTokenName.trim());
    }
  };

  if (isLoading) {
    return (
      <div className="min-h-screen bg-gray-50 p-4">
        <div className="max-w-4xl mx-auto">
          <div className="flex items-center gap-4 mb-6">
            <Link href="/">
              <Button variant="ghost" size="sm">
                <ArrowLeft className="h-4 w-4 mr-2" />
                Back
              </Button>
            </Link>
            <div>
              <h1 className="text-2xl font-bold text-gray-900">API Tokens</h1>
              <p className="text-gray-600">Loading...</p>
            </div>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-50 p-4">
      <div className="max-w-4xl mx-auto">
        <div className="flex items-center justify-between mb-6">
          <div className="flex items-center gap-4">
            <Link href="/">
              <Button variant="ghost" size="sm">
                <ArrowLeft className="h-4 w-4 mr-2" />
                Back
              </Button>
            </Link>
            <div>
              <h1 className="text-2xl font-bold text-gray-900">API Tokens</h1>
              <p className="text-gray-600">Manage tokens for API access to your Personal KB</p>
            </div>
          </div>
          
          <Dialog open={isCreateDialogOpen} onOpenChange={setIsCreateDialogOpen}>
            <DialogTrigger asChild>
              <Button>
                <Plus className="h-4 w-4 mr-2" />
                Create Token
              </Button>
            </DialogTrigger>
            <DialogContent>
              <DialogHeader>
                <DialogTitle>Create New API Token</DialogTitle>
                <DialogDescription>
                  Give your token a descriptive name to help you remember what it's used for.
                </DialogDescription>
              </DialogHeader>
              <div className="space-y-4">
                <div>
                  <Label htmlFor="tokenName">Token Name</Label>
                  <Input
                    id="tokenName"
                    value={newTokenName}
                    onChange={(e) => setNewTokenName(e.target.value)}
                    placeholder="e.g., Mobile App, Script Access, etc."
                    onKeyDown={(e) => {
                      if (e.key === 'Enter') {
                        handleCreateToken();
                      }
                    }}
                  />
                </div>
                <div className="flex justify-end gap-2">
                  <Button variant="outline" onClick={() => setIsCreateDialogOpen(false)}>
                    Cancel
                  </Button>
                  <Button 
                    onClick={handleCreateToken}
                    disabled={!newTokenName.trim() || createMutation.isPending}
                  >
                    {createMutation.isPending ? "Creating..." : "Create Token"}
                  </Button>
                </div>
              </div>
            </DialogContent>
          </Dialog>
        </div>

        <div className="bg-white rounded-lg border border-gray-200 p-6 mb-6">
          <h2 className="text-lg font-semibold mb-4">About API Tokens</h2>
          <div className="text-gray-600 space-y-2">
            <p>API tokens allow you to access your Personal KB programmatically. Use them to:</p>
            <ul className="list-disc pl-6 space-y-1">
              <li>Create and retrieve entries from scripts or applications</li>
              <li>Integrate with automation tools</li>
              <li>Build custom interfaces for your knowledge base</li>
            </ul>
            <p className="text-sm mt-4">
              <strong>Security note:</strong> Treat API tokens like passwords. Store them securely and never share them publicly.
            </p>
          </div>
        </div>

        <div className="space-y-4">
          {tokens.length === 0 ? (
            <Card>
              <CardContent className="text-center py-12">
                <div className="mx-auto w-16 h-16 bg-gray-100 rounded-full flex items-center justify-center mb-4">
                  <Plus className="h-8 w-8 text-gray-400" />
                </div>
                <h3 className="text-lg font-medium text-gray-900 mb-2">No API tokens</h3>
                <p className="text-gray-500 mb-4">Create your first API token to start accessing your data programmatically.</p>
                <Button onClick={() => setIsCreateDialogOpen(true)}>
                  Create Your First Token
                </Button>
              </CardContent>
            </Card>
          ) : (
            tokens.map((token) => (
              <Card key={token.id}>
                <CardHeader>
                  <div className="flex items-center justify-between">
                    <div>
                      <CardTitle className="text-lg">{token.name}</CardTitle>
                      <CardDescription>
                        Created {new Date(token.createdAt).toLocaleDateString()}
                        {token.lastUsed && (
                          <span className="ml-2">
                            • Last used {new Date(token.lastUsed).toLocaleDateString()}
                          </span>
                        )}
                      </CardDescription>
                    </div>
                    <Button
                      variant="ghost"
                      size="sm"
                      onClick={() => deleteMutation.mutate(token.id)}
                      disabled={deleteMutation.isPending}
                    >
                      <Trash2 className="h-4 w-4" />
                    </Button>
                  </div>
                </CardHeader>
                <CardContent>
                  <div className="flex items-center gap-2">
                    <Input
                      value={showToken[token.id] ? token.token : "pkb_" + "•".repeat(60)}
                      readOnly
                      className="font-mono text-sm bg-gray-50"
                    />
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={() => toggleTokenVisibility(token.id)}
                    >
                      {showToken[token.id] ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
                    </Button>
                    {showToken[token.id] && (
                      <Button
                        variant="outline"
                        size="sm"
                        onClick={() => copyToClipboard(token.token)}
                      >
                        <Copy className="h-4 w-4" />
                      </Button>
                    )}
                  </div>
                </CardContent>
              </Card>
            ))
          )}
        </div>
      </div>
    </div>
  );
}