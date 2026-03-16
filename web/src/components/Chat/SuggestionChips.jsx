export default function SuggestionChips({ chips, onSelect }) {
  if (!chips || chips.length === 0) return null;

  return (
    <div className="suggestion-chips">
      {chips.map((chip, i) => (
        <button
          key={i}
          className="chip"
          disabled={!onSelect}
          onClick={() => onSelect?.(chip)}
        >
          {chip}
        </button>
      ))}
    </div>
  );
}
