import { Link2, BookOpen, Lightbulb } from "lucide-react";
import type { Entry } from "@shared/schema";

interface EntryCardProps {
  entry: Entry;
  searchQuery?: string;
}

function highlightText(text: string, query?: string) {
  if (!query) return text;
  
  const regex = new RegExp(`(${query})`, "gi");
  const parts = text.split(regex);
  
  return parts.map((part, index) =>
    regex.test(part) ? (
      <mark key={index} className="bg-yellow-200 text-dark">
        {part}
      </mark>
    ) : (
      part
    )
  );
}

function extractHashtags(content: string) {
  const hashtagRegex = /#(\w+)/g;
  const hashtags: string[] = [];
  let match;
  while ((match = hashtagRegex.exec(content)) !== null) {
    hashtags.push(match[1]);
    if (hashtags.length >= 3) break;
  }
  return hashtags;
}

function getReadTime(content: string) {
  const words = content.split(/\s+/).length;
  const readTime = Math.ceil(words / 200); // Assume 200 words per minute
  return `${readTime} min read`;
}

function getConnectionCount(content: string) {
  const hashtags = extractHashtags(content);
  return hashtags.length;
}

function cleanContentForPreview(content: string) {
  // Remove image markdown patterns from content preview
  const cleaned = content.replace(/!\[([^\]]*)\]\(([^)]+)\)/g, '').trim();
  console.log('Original content:', content.substring(0, 100));
  console.log('Cleaned content:', cleaned.substring(0, 100));
  return cleaned;
}

export default function EntryCard({ entry, searchQuery }: EntryCardProps) {
  const hashtags = extractHashtags(entry.content);
  const readTime = getReadTime(entry.content);
  const connectionCount = getConnectionCount(entry.content);
  const isNote = entry.type === "note";

  const handleClick = () => {
    window.location.href = `/entry/${entry.id}`;
  };

  return (
    <div
      className="bg-white rounded-lg border border-gray-200 hover:shadow-md transition-shadow cursor-pointer"
      onClick={handleClick}
    >
      <div className="p-4">
        <div className="flex items-center justify-between mb-2">
          <div className="flex items-center space-x-2">
            {isNote ? (
              <Lightbulb className="h-4 w-4 text-yellow-500" />
            ) : (
              <BookOpen className="h-4 w-4 text-primary" />
            )}
            <h5 className="font-medium text-dark">
              {highlightText(entry.title, searchQuery)}
            </h5>
          </div>
          <div className="flex items-center space-x-2">
            <span className={`px-2 py-1 text-xs font-medium rounded-full ${
              isNote 
                ? "bg-yellow-100 text-yellow-700" 
                : "bg-blue-100 text-blue-700"
            }`}>
              {isNote ? "Note" : "Journal"}
            </span>
            <span className="text-xs text-secondary">{readTime}</span>
          </div>
        </div>
        
        <p className="text-secondary text-sm line-clamp-2 mb-3">
          {highlightText(
            cleanContentForPreview(entry.content).substring(0, 200) + (cleanContentForPreview(entry.content).length > 200 ? "..." : ""),
            searchQuery
          )}
        </p>
        
        <div className="flex items-center justify-between">
          <div className="flex space-x-2">
            {hashtags.map((tag, index) => (
              <span
                key={index}
                className="px-2 py-1 bg-gray-100 text-gray-700 text-xs rounded"
              >
                #{tag}
              </span>
            ))}
            {hashtags.length === 0 && (
              <span className="text-xs text-gray-400">No tags</span>
            )}
          </div>
          
          <div className="flex items-center space-x-2 text-xs text-secondary">
            <Link2 className="h-3 w-3" />
            <span>{connectionCount} connections</span>
          </div>
        </div>
        
        <div className="flex items-center justify-between mt-3 pt-3 border-t border-gray-100">
          <span className="text-xs text-secondary">
            {new Date(entry.date).toLocaleDateString("en-US", {
              month: "short",
              day: "numeric",
              year: "numeric",
            })}
          </span>
          <span className="text-xs text-secondary">
            Updated {new Date(entry.updatedAt || entry.createdAt || entry.date).toLocaleDateString()}
          </span>
        </div>
      </div>
    </div>
  );
}
