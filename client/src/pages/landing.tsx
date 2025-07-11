import { useState, useEffect } from "react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { BookOpen, PenTool, Search, Server, Users, Shield, Network } from "lucide-react";
import { Link } from "wouter";

export default function Landing() {
  const [authMethod, setAuthMethod] = useState<string | null>(null);

  useEffect(() => {
    // Check which authentication method is available
    fetch("/api/health")
      .then(res => res.json())
      .then(() => {
        // Try to detect auth method by checking for specific endpoints
        fetch("/api/auth/user", { credentials: "include" })
          .then(res => {
            if (res.status === 401) {
              setAuthMethod("local"); // Local auth returns 401 for unauthenticated users
            }
          })
          .catch(() => {
            setAuthMethod("external"); // External auth (Google/Replit) available
          });
      })
      .catch(() => {
        setAuthMethod("external");
      });
  }, []);

  const getAuthButton = () => {
    if (authMethod === "local") {
      return (
        <Link href="/auth">
          <Button 
            size="lg"
            className="bg-primary hover:bg-blue-700 text-white px-8 py-3"
          >
            Get Started
          </Button>
        </Link>
      );
    } else {
      return (
        <Link href="/auth">
          <Button 
            size="lg"
            className="bg-primary hover:bg-blue-700 text-white px-8 py-3"
          >
            Start Your Journey
          </Button>
        </Link>
      );
    }
  };

  return (
    <div className="min-h-screen bg-neutral">
      {/* Hero Section */}
      <div className="bg-white border-b border-gray-200">
        <div className="max-w-6xl mx-auto px-6 py-16">
          <div className="text-center">
            <div className="flex items-center justify-center space-x-3 mb-6">
              <div className="w-12 h-12 bg-primary rounded-xl flex items-center justify-center">
                <BookOpen className="h-6 w-6 text-white" />
              </div>
              <h1 className="text-3xl font-bold text-dark">Personal KB</h1>
            </div>
            <p className="text-xl text-secondary mb-8 max-w-2xl mx-auto">
              Your personal knowledge management system with journaling, backlinking, and mindmap features. 
              Capture thoughts, connect ideas, and visualize your knowledge.
            </p>
            {getAuthButton()}
          </div>
        </div>
      </div>

      {/* Features Section */}
      <div className="max-w-6xl mx-auto px-6 py-16">
        <div className="text-center mb-12">
          <h2 className="text-2xl font-bold text-dark mb-4">Everything you need for knowledge management</h2>
          <p className="text-secondary">Powerful features designed to help you think, create, and connect ideas.</p>
        </div>
        
        <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-8">
          <Card>
            <CardHeader>
              <div className="w-10 h-10 bg-blue-100 rounded-lg flex items-center justify-center mb-4">
                <PenTool className="h-5 w-5 text-primary" />
              </div>
              <CardTitle className="text-lg">Rich Text Journaling</CardTitle>
            </CardHeader>
            <CardContent>
              <p className="text-secondary">
                Write with a powerful editor that supports markdown, image pasting, and formatting. 
                Create daily entries with a single click.
              </p>
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <div className="w-10 h-10 bg-green-100 rounded-lg flex items-center justify-center mb-4">
                <Network className="h-5 w-5 text-accent" />
              </div>
              <CardTitle className="text-lg">Smart Backlinking</CardTitle>
            </CardHeader>
            <CardContent>
              <p className="text-secondary">
                Use hashtags to automatically connect related entries. 
                Build a web of knowledge that grows with your thoughts.
              </p>
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <div className="w-10 h-10 bg-purple-100 rounded-lg flex items-center justify-center mb-4">
                <Network className="h-5 w-5 text-purple-600" />
              </div>
              <CardTitle className="text-lg">Visual Mindmap</CardTitle>
            </CardHeader>
            <CardContent>
              <p className="text-secondary">
                Visualize connections between your entries and ideas. 
                See the big picture of your knowledge network.
              </p>
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <div className="w-10 h-10 bg-orange-100 rounded-lg flex items-center justify-center mb-4">
                <Server className="h-5 w-5 text-orange-600" />
              </div>
              <CardTitle className="text-lg">Self Hosting</CardTitle>
            </CardHeader>
            <CardContent>
              <p className="text-secondary">
                Run your own instance with complete control over your data. 
                Deploy easily on any server or platform you choose.
              </p>
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <div className="w-10 h-10 bg-indigo-100 rounded-lg flex items-center justify-center mb-4">
                <Users className="h-5 w-5 text-indigo-600" />
              </div>
              <CardTitle className="text-lg">Multi-User Support</CardTitle>
            </CardHeader>
            <CardContent>
              <p className="text-secondary">
                Secure authentication system supporting multiple users 
                with isolated data access for each account.
              </p>
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <div className="w-10 h-10 bg-red-100 rounded-lg flex items-center justify-center mb-4">
                <Shield className="h-5 w-5 text-red-600" />
              </div>
              <CardTitle className="text-lg">Mobile Responsive</CardTitle>
            </CardHeader>
            <CardContent>
              <p className="text-secondary">
                Access your notes anywhere, anytime. Fully responsive design 
                that works seamlessly across all devices.
              </p>
            </CardContent>
          </Card>
        </div>
      </div>

      {/* CTA Section */}
      <div className="bg-white border-t border-gray-200">
        <div className="max-w-4xl mx-auto px-6 py-16 text-center">
          <h2 className="text-2xl font-bold text-dark mb-4">Ready to start organizing your thoughts?</h2>
          <p className="text-secondary mb-8">
            Transform your note-taking and knowledge management with powerful backlinking and visual connections.
          </p>
          <Link href="/auth">
            <Button 
              size="lg"
              className="bg-primary hover:bg-blue-700 text-white px-8 py-3"
            >
              Get Started Now
            </Button>
          </Link>
        </div>
      </div>
    </div>
  );
}
