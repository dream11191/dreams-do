import { useState } from 'react';
import type { Tag } from '../types';
import { generateId } from '../utils';

interface TagSelectorProps {
  tags: Tag[];
  onChange: (tags: Tag[]) => void;
}

const presetColors = ['#84cc16', '#ef4444', '#f59e0b', '#10b981', '#3b82f6', '#8b5cf6', '#ec4899', '#06b6d4'];

export default function TagSelector({ tags, onChange }: TagSelectorProps) {
  const [inputValue, setInputValue] = useState('');

  const addTag = () => {
    const name = inputValue.trim();
    if (!name) return;
    if (tags.some((t) => t.name === name)) return;
    const color = presetColors[tags.length % presetColors.length];
    onChange([...tags, { id: generateId(), name, color }]);
    setInputValue('');
  };

  const removeTag = (id: string) => {
    onChange(tags.filter((t) => t.id !== id));
  };

  return (
    <div>
      <div className="flex gap-2 mb-2">
        <input
          className="input flex-1 text-sm"
          placeholder="输入标签后按回车添加"
          value={inputValue}
          onChange={(e) => setInputValue(e.target.value)}
          onKeyDown={(e) => { if (e.key === 'Enter') { e.preventDefault(); addTag(); } }}
        />
        <button className="btn-primary btn-sm" onClick={addTag}>添加</button>
      </div>
      <div className="flex flex-wrap gap-1.5">
        {tags.map((tag) => (
          <span
            key={tag.id}
            className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-xs font-medium text-white"
            style={{ backgroundColor: tag.color }}
          >
            {tag.name}
            <button onClick={() => removeTag(tag.id)} className="hover:bg-white/20 rounded-full p-0.5">&times;</button>
          </span>
        ))}
      </div>
    </div>
  );
}