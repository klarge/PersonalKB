import { Link } from "wouter";
import { useQuery } from "@tanstack/react-query";

interface HashtagRendererProps {
  content: string;
}

interface AutocompleteEntry {
  id: number;
  title: string;
  type: string;
}

export default function HashtagRenderer({ content }: HashtagRendererProps) {
  const { data: autocompleteEntries = [] } = useQuery<AutocompleteEntry[]>({
    queryKey: ["/api/entries/autocomplete"],
  });

  const renderContentWithLinks = (text: string) => {
    // Split by both #hashtag and #[[Entry Name]] patterns
    const parts = text.split(/(#\[\[([^\]]+)\]\]|#\w+)/g);
    
    return parts.map((part, index) => {
      // Skip if part is undefined or empty
      if (!part) return null;
      
      if (part.startsWith('#[[') && part.endsWith(']]')) {
        // Handle #[[Entry Name]] format
        const entryTitle = part.slice(3, -2); // Remove #[[ and ]]
        const matchingEntry = autocompleteEntries.find(
          entry => entry.title.toLowerCase() === entryTitle.toLowerCase()
        );
        
        if (matchingEntry) {
          return (
            <Link key={index} href={`/entry/${matchingEntry.id}`}>
              <span className="text-blue-600 hover:text-blue-800 underline cursor-pointer font-medium">
                {part}
              </span>
            </Link>
          );
        }
      } else if (part.startsWith('#') && !part.includes('[')) {
        // Handle simple #hashtag format
        const hashtagText = part.slice(1); // Remove the #
        const matchingEntry = autocompleteEntries.find(
          entry => entry.title.replace(/\s+/g, '').toLowerCase() === hashtagText.toLowerCase()
        );
        
        if (matchingEntry) {
          return (
            <Link key={index} href={`/entry/${matchingEntry.id}`}>
              <span className="text-blue-600 hover:text-blue-800 underline cursor-pointer font-medium">
                {part}
              </span>
            </Link>
          );
        }
      }
      
      // Return regular text (preserve line breaks)
      return part.split('\n').map((line, lineIndex, lines) => (
        <span key={`${index}-${lineIndex}`}>
          {line}
          {lineIndex < lines.length - 1 && <br />}
        </span>
      ));
    });
  };

  return <div className="whitespace-pre-wrap">{renderContentWithLinks(content)}</div>;
}