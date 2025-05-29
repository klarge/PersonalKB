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
    // Split by hashtags while preserving them
    const parts = text.split(/(#\w+)/g);
    
    return parts.map((part, index) => {
      if (part.startsWith('#')) {
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