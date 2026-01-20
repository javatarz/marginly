'use client';

import { useState } from 'react';
import { createClient } from '@/lib/supabase/client';
import { useRouter } from 'next/navigation';

interface EditDisplayNameProps {
  userId: string;
  currentName: string | null;
}

export function EditDisplayName({ userId, currentName }: EditDisplayNameProps) {
  const [isEditing, setIsEditing] = useState(false);
  const [name, setName] = useState(currentName || '');
  const [isSubmitting, setIsSubmitting] = useState(false);

  const router = useRouter();
  const supabase = createClient();

  const handleSave = async () => {
    setIsSubmitting(true);

    const { error } = await supabase.from('profiles').upsert({
      id: userId,
      display_name: name.trim() || null,
    });

    setIsSubmitting(false);

    if (error) {
      console.error('Failed to update display name:', error);
      return;
    }

    setIsEditing(false);
    router.refresh();
  };

  if (isEditing) {
    return (
      <div className="flex items-center gap-2">
        <input
          type="text"
          value={name}
          onChange={(e) => setName(e.target.value)}
          placeholder="Display name"
          className="px-2 py-1 text-sm border border-gray-300 rounded focus:outline-none focus:ring-1 focus:ring-accent"
          autoFocus
          onKeyDown={(e) => {
            if (e.key === 'Enter') handleSave();
            if (e.key === 'Escape') setIsEditing(false);
          }}
        />
        <button
          onClick={handleSave}
          disabled={isSubmitting}
          className="text-xs text-green-600 hover:text-green-800 disabled:opacity-50"
        >
          Save
        </button>
        <button
          onClick={() => {
            setIsEditing(false);
            setName(currentName || '');
          }}
          className="text-xs text-gray-500 hover:text-gray-700"
        >
          Cancel
        </button>
      </div>
    );
  }

  return (
    <button
      onClick={() => setIsEditing(true)}
      className="text-xs text-blue-600 hover:text-blue-800"
      title="Edit display name"
    >
      Edit
    </button>
  );
}
