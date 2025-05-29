import { useQuery } from "@tanstack/react-query";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { ArrowLeft, BookOpen, StickyNote, User, MapPin, Package, Calendar, TrendingUp } from "lucide-react";
import { Link } from "wouter";
import type { Entry } from "@shared/schema";

export default function StatsPage() {
  const { data: allEntries = [], isLoading } = useQuery<Entry[]>({
    queryKey: ["/api/entries"],
  });

  const stats = {
    total: allEntries.length,
    journal: allEntries.filter(e => e.type === "journal").length,
    note: allEntries.filter(e => e.type === "note").length,
    person: allEntries.filter(e => e.type === "person").length,
    place: allEntries.filter(e => e.type === "place").length,
    thing: allEntries.filter(e => e.type === "thing").length,
  };

  // Calculate recent activity (last 30 days)
  const thirtyDaysAgo = new Date();
  thirtyDaysAgo.setDate(thirtyDaysAgo.getDate() - 30);
  const recentEntries = allEntries.filter(e => new Date(e.date) >= thirtyDaysAgo);

  // Find most common hashtags
  const hashtagCounts = allEntries.reduce((acc, entry) => {
    const hashtags = entry.content.match(/#[\w]+/g) || [];
    hashtags.forEach(tag => {
      acc[tag] = (acc[tag] || 0) + 1;
    });
    return acc;
  }, {} as Record<string, number>);

  const topHashtags = Object.entries(hashtagCounts)
    .sort(([,a], [,b]) => b - a)
    .slice(0, 5);

  if (isLoading) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <div className="text-center">
          <div className="text-lg text-gray-600">Loading stats...</div>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-50">
      {/* Header */}
      <div className="bg-white border-b">
        <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex items-center justify-between h-16">
            <div className="flex items-center space-x-4">
              <Link href="/">
                <Button variant="ghost" size="sm">
                  <ArrowLeft className="h-4 w-4 mr-2" />
                  Back
                </Button>
              </Link>
              <h1 className="text-xl font-semibold text-gray-900">Knowledge Base Stats</h1>
            </div>
          </div>
        </div>
      </div>

      <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        {/* Overview Cards */}
        <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-6 gap-4 mb-8">
          <Card>
            <CardHeader className="pb-2">
              <CardTitle className="text-sm font-medium text-gray-500">Total Entries</CardTitle>
            </CardHeader>
            <CardContent className="pt-0">
              <div className="flex items-center">
                <TrendingUp className="h-4 w-4 text-blue-500 mr-2" />
                <span className="text-2xl font-bold">{stats.total}</span>
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardHeader className="pb-2">
              <CardTitle className="text-sm font-medium text-gray-500">Journal</CardTitle>
            </CardHeader>
            <CardContent className="pt-0">
              <div className="flex items-center">
                <BookOpen className="h-4 w-4 text-blue-500 mr-2" />
                <span className="text-2xl font-bold">{stats.journal}</span>
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardHeader className="pb-2">
              <CardTitle className="text-sm font-medium text-gray-500">Notes</CardTitle>
            </CardHeader>
            <CardContent className="pt-0">
              <div className="flex items-center">
                <StickyNote className="h-4 w-4 text-yellow-500 mr-2" />
                <span className="text-2xl font-bold">{stats.note}</span>
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardHeader className="pb-2">
              <CardTitle className="text-sm font-medium text-gray-500">People</CardTitle>
            </CardHeader>
            <CardContent className="pt-0">
              <div className="flex items-center">
                <User className="h-4 w-4 text-green-500 mr-2" />
                <span className="text-2xl font-bold">{stats.person}</span>
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardHeader className="pb-2">
              <CardTitle className="text-sm font-medium text-gray-500">Places</CardTitle>
            </CardHeader>
            <CardContent className="pt-0">
              <div className="flex items-center">
                <MapPin className="h-4 w-4 text-red-500 mr-2" />
                <span className="text-2xl font-bold">{stats.place}</span>
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardHeader className="pb-2">
              <CardTitle className="text-sm font-medium text-gray-500">Things</CardTitle>
            </CardHeader>
            <CardContent className="pt-0">
              <div className="flex items-center">
                <Package className="h-4 w-4 text-purple-500 mr-2" />
                <span className="text-2xl font-bold">{stats.thing}</span>
              </div>
            </CardContent>
          </Card>
        </div>

        <div className="grid md:grid-cols-2 gap-6">
          {/* Recent Activity */}
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center">
                <Calendar className="h-5 w-5 mr-2" />
                Recent Activity (30 days)
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="text-3xl font-bold text-blue-600 mb-2">
                {recentEntries.length}
              </div>
              <p className="text-sm text-gray-600">
                {recentEntries.length === 1 ? 'entry created' : 'entries created'} in the last 30 days
              </p>
              <div className="mt-4 space-y-2">
                <div className="flex justify-between text-sm">
                  <span>Journal entries:</span>
                  <span className="font-medium">{recentEntries.filter(e => e.type === "journal").length}</span>
                </div>
                <div className="flex justify-between text-sm">
                  <span>Notes:</span>
                  <span className="font-medium">{recentEntries.filter(e => e.type === "note").length}</span>
                </div>
                <div className="flex justify-between text-sm">
                  <span>Other entries:</span>
                  <span className="font-medium">
                    {recentEntries.filter(e => !["journal", "note"].includes(e.type)).length}
                  </span>
                </div>
              </div>
            </CardContent>
          </Card>

          {/* Top Hashtags */}
          <Card>
            <CardHeader>
              <CardTitle>Most Used Hashtags</CardTitle>
            </CardHeader>
            <CardContent>
              {topHashtags.length > 0 ? (
                <div className="space-y-3">
                  {topHashtags.map(([hashtag, count]) => (
                    <div key={hashtag} className="flex items-center justify-between">
                      <span className="text-sm font-medium text-blue-600">{hashtag}</span>
                      <div className="flex items-center">
                        <div className="w-20 bg-gray-200 rounded-full h-2 mr-2">
                          <div 
                            className="bg-blue-600 h-2 rounded-full" 
                            style={{ width: `${(count / topHashtags[0][1]) * 100}%` }}
                          ></div>
                        </div>
                        <span className="text-sm text-gray-600 w-6">{count}</span>
                      </div>
                    </div>
                  ))}
                </div>
              ) : (
                <p className="text-sm text-gray-500">No hashtags found. Start using #hashtags to connect your entries!</p>
              )}
            </CardContent>
          </Card>
        </div>
      </div>
    </div>
  );
}