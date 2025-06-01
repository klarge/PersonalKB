// Non-clickable version of hashtag renderer for preview cards to avoid nested anchors
interface HashtagPreviewProps {
  content: string;
}

export default function HashtagPreview({ content }: HashtagPreviewProps) {
  const renderContentWithStyledHashtags = (text: string) => {
    // Split by both #hashtag and #[[Entry Name]] patterns but don't make them clickable
    const parts = text.split(/(#\[\[([^\]]+)\]\]|#\w+)/g);
    
    return parts.map((part, index) => {
      // Skip if part is undefined or empty
      if (!part) return null;
      
      if (part.startsWith('#[[') && part.endsWith(']]')) {
        // Handle #[[Entry Name]] format - style but don't make clickable
        return (
          <span key={index} className="text-blue-600 font-medium">
            {part}
          </span>
        );
      } else if (part.startsWith('#') && !part.includes('[')) {
        // Handle simple #hashtag format - style but don't make clickable
        return (
          <span key={index} className="text-blue-600 font-medium">
            {part}
          </span>
        );
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

  return <div className="whitespace-pre-wrap">{renderContentWithStyledHashtags(content)}</div>;
}