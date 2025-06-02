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
    // First replace all image markdown with a placeholder, then process normally
    let processedText = text;
    const imageMatches: Array<{match: string, element: JSX.Element}> = [];
    
    // Find all image patterns and replace with placeholders
    const imageRegex = /!\[([^\]]*)\]\(([^)]+)\)/g;
    let imageMatch;
    let imageIndex = 0;
    
    while ((imageMatch = imageRegex.exec(text)) !== null) {
      const [fullMatch, altText, imageSrc] = imageMatch;
      const placeholder = `__IMAGE_PLACEHOLDER_${imageIndex}__`;
      
      imageMatches.push({
        match: placeholder,
        element: (
          <img 
            key={`img-${imageIndex}`}
            src={imageSrc}
            alt={altText}
            className="max-w-full h-auto rounded-lg shadow-sm my-2"
            style={{ maxHeight: '400px' }}
          />
        )
      });
      
      processedText = processedText.replace(fullMatch, placeholder);
      imageIndex++;
    }
    
    // Now split by hashtags and preserve other content
    const parts = processedText.split(/(#\[\[([^\]]+)\]\]|#[^\s\n]+|__IMAGE_PLACEHOLDER_\d+__)/g);
    
    return parts.map((part, index) => {
      // Skip if part is undefined or empty
      if (!part) return null;
      
      // Handle image placeholders
      const imagePlaceholder = imageMatches.find(img => img.match === part);
      if (imagePlaceholder) {
        return imagePlaceholder.element;
      }
      
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
        // Handle simple #hashtag format - match exact title after #
        const hashtagText = part.slice(1); // Remove the #
        const matchingEntry = autocompleteEntries.find(
          entry => entry.title === hashtagText
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