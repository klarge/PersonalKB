import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Smartphone, Server, User } from "lucide-react";
import { mobileAuth } from "@/lib/mobile-auth";
import { useToast } from "@/hooks/use-toast";

interface MobileSetupProps {
  onSetupComplete: () => void;
}

export default function MobileSetup({ onSetupComplete }: MobileSetupProps) {
  const [step, setStep] = useState<'server' | 'login'>('server');
  const [serverUrl, setServerUrl] = useState('');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const { toast } = useToast();

  const handleServerSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!serverUrl.trim()) {
      toast({
        title: "Server URL required",
        description: "Please enter your PersonalKB server URL",
        variant: "destructive",
      });
      return;
    }

    setIsLoading(true);
    try {
      // Test server connectivity
      const normalizedUrl = serverUrl.startsWith('http') ? serverUrl : `https://${serverUrl}`;
      const testUrl = normalizedUrl.replace(/\/$/, '');
      
      const response = await fetch(`${testUrl}/api/health`);
      if (!response.ok) {
        throw new Error('Server not reachable');
      }

      await mobileAuth.setServerUrl(testUrl);
      setStep('login');
      toast({
        title: "Server connected",
        description: "Please enter your login credentials",
      });
    } catch (error) {
      toast({
        title: "Connection failed",
        description: "Could not connect to server. Please check the URL and try again.",
        variant: "destructive",
      });
    } finally {
      setIsLoading(false);
    }
  };

  const handleLoginSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!email.trim() || !password.trim()) {
      toast({
        title: "Credentials required",
        description: "Please enter both email and password",
        variant: "destructive",
      });
      return;
    }

    setIsLoading(true);
    try {
      const savedServerUrl = await mobileAuth.getServerUrl();
      if (!savedServerUrl) {
        throw new Error('Server URL not configured');
      }

      const { user, apiToken } = await mobileAuth.login(savedServerUrl, email, password);
      await mobileAuth.saveAuth(apiToken, user);
      
      toast({
        title: "Login successful",
        description: "Welcome to PersonalKB!",
      });
      
      onSetupComplete();
    } catch (error: any) {
      toast({
        title: "Login failed",
        description: error.message || "Invalid credentials",
        variant: "destructive",
      });
    } finally {
      setIsLoading(false);
    }
  };

  const goBack = () => {
    setStep('server');
  };

  return (
    <div className="min-h-screen bg-gray-50 flex items-center justify-center p-4">
      <Card className="w-full max-w-md">
        <CardHeader className="text-center">
          <div className="mx-auto mb-4 p-3 bg-blue-100 rounded-full w-fit">
            <Smartphone className="h-8 w-8 text-blue-600" />
          </div>
          <CardTitle>PersonalKB Mobile Setup</CardTitle>
          <CardDescription>
            {step === 'server' 
              ? 'Connect to your PersonalKB server' 
              : 'Sign in to your account'
            }
          </CardDescription>
        </CardHeader>
        <CardContent>
          {step === 'server' ? (
            <form onSubmit={handleServerSubmit} className="space-y-4">
              <div>
                <Label htmlFor="server-url" className="flex items-center gap-2">
                  <Server className="h-4 w-4" />
                  Server URL
                </Label>
                <Input
                  id="server-url"
                  type="url"
                  placeholder="https://your-personalkb.com"
                  value={serverUrl}
                  onChange={(e) => setServerUrl(e.target.value)}
                  className="mt-1"
                />
                <p className="text-sm text-gray-600 mt-1">
                  Enter the URL where your PersonalKB instance is hosted
                </p>
              </div>
              <Button type="submit" className="w-full" disabled={isLoading}>
                {isLoading ? "Connecting..." : "Connect to Server"}
              </Button>
            </form>
          ) : (
            <form onSubmit={handleLoginSubmit} className="space-y-4">
              <div>
                <Label htmlFor="email" className="flex items-center gap-2">
                  <User className="h-4 w-4" />
                  Email
                </Label>
                <Input
                  id="email"
                  type="email"
                  placeholder="your.email@example.com"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  className="mt-1"
                />
              </div>
              <div>
                <Label htmlFor="password">Password</Label>
                <Input
                  id="password"
                  type="password"
                  placeholder="Your password"
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  className="mt-1"
                />
              </div>
              <div className="flex gap-2">
                <Button 
                  type="button" 
                  variant="outline" 
                  onClick={goBack}
                  className="flex-1"
                >
                  Back
                </Button>
                <Button type="submit" className="flex-1" disabled={isLoading}>
                  {isLoading ? "Signing in..." : "Sign In"}
                </Button>
              </div>
            </form>
          )}
        </CardContent>
      </Card>
    </div>
  );
}