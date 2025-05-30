import { useState, useEffect } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from "@/components/ui/card";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { Smartphone, Globe } from "lucide-react";
import { Capacitor } from "@capacitor/core";

export default function ServerConfig() {
  const [serverUrl, setServerUrl] = useState("");
  const [isValidating, setIsValidating] = useState(false);
  const [error, setError] = useState("");
  const [isConfigured, setIsConfigured] = useState(false);

  useEffect(() => {
    // Check if server URL is already configured
    const savedUrl = localStorage.getItem("serverUrl");
    if (savedUrl) {
      setServerUrl(savedUrl);
      setIsConfigured(true);
    }
  }, []);

  const validateAndSaveUrl = async () => {
    if (!serverUrl.trim()) {
      setError("Please enter a server URL");
      return;
    }

    setIsValidating(true);
    setError("");

    try {
      // Ensure URL has protocol
      let url = serverUrl.trim();
      if (!url.startsWith("http://") && !url.startsWith("https://")) {
        url = "https://" + url;
      }

      // Remove trailing slash
      url = url.replace(/\/$/, "");

      // Validate URL format
      const urlObj = new URL(url);
      
      // Test connection to the server
      const response = await fetch(`${url}/api/health`, {
        method: "GET",
        headers: { "Content-Type": "application/json" },
      });

      if (!response.ok) {
        throw new Error("Server is not responding correctly");
      }

      // Save the URL
      localStorage.setItem("serverUrl", url);
      setServerUrl(url);
      setIsConfigured(true);

      // Reload the app to use the new URL
      if (Capacitor.isNativePlatform()) {
        window.location.reload();
      }
      
    } catch (err: any) {
      setError(
        err.message || 
        "Could not connect to the server. Please check the URL and try again."
      );
    } finally {
      setIsValidating(false);
    }
  };

  const resetConfiguration = () => {
    localStorage.removeItem("serverUrl");
    setServerUrl("");
    setIsConfigured(false);
    setError("");
  };

  if (isConfigured) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-blue-50 to-indigo-100 dark:from-gray-900 dark:to-gray-800 flex items-center justify-center p-4">
        <Card className="w-full max-w-md">
          <CardHeader className="text-center">
            <div className="mx-auto mb-4 w-12 h-12 bg-green-100 dark:bg-green-900 rounded-full flex items-center justify-center">
              <Globe className="w-6 h-6 text-green-600 dark:text-green-400" />
            </div>
            <CardTitle>Server Configured</CardTitle>
            <CardDescription>
              Connected to: {serverUrl}
            </CardDescription>
          </CardHeader>
          <CardFooter className="flex flex-col space-y-2">
            <Button onClick={resetConfiguration} variant="outline" className="w-full">
              Change Server
            </Button>
          </CardFooter>
        </Card>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-blue-50 to-indigo-100 dark:from-gray-900 dark:to-gray-800 flex items-center justify-center p-4">
      <Card className="w-full max-w-md">
        <CardHeader className="text-center">
          <div className="mx-auto mb-4 w-12 h-12 bg-blue-100 dark:bg-blue-900 rounded-full flex items-center justify-center">
            <Smartphone className="w-6 h-6 text-blue-600 dark:text-blue-400" />
          </div>
          <CardTitle>Welcome to Personal KB</CardTitle>
          <CardDescription>
            Enter your Personal KB server URL to get started
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="space-y-2">
            <Label htmlFor="serverUrl">Server URL</Label>
            <Input
              id="serverUrl"
              type="url"
              placeholder="https://your-server.com"
              value={serverUrl}
              onChange={(e) => setServerUrl(e.target.value)}
              onKeyPress={(e) => e.key === "Enter" && validateAndSaveUrl()}
            />
          </div>
          
          {error && (
            <Alert variant="destructive">
              <AlertDescription>{error}</AlertDescription>
            </Alert>
          )}

          <Alert>
            <AlertDescription>
              Enter the URL where your Personal KB server is hosted. This could be your Replit deployment, self-hosted server, or Docker container.
            </AlertDescription>
          </Alert>
        </CardContent>
        <CardFooter>
          <Button 
            onClick={validateAndSaveUrl} 
            disabled={isValidating || !serverUrl.trim()}
            className="w-full"
          >
            {isValidating ? "Connecting..." : "Connect to Server"}
          </Button>
        </CardFooter>
      </Card>
    </div>
  );
}