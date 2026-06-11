import os
import re

def process_file(filepath):
    with open(filepath, 'r') as f:
        content = f.read()

    # Replacements: (pattern, replacement)
    replacements = [
        # Backgrounds
        (r'\bbg-white\b(?!\s*dark:bg-)', r'bg-white dark:bg-zinc-950'),
        (r'\bbg-slate-50\b(?!\s*dark:bg-)', r'bg-slate-50 dark:bg-zinc-900'),
        (r'\bbg-zinc-50\b(?!\s*dark:bg-)', r'bg-zinc-50 dark:bg-zinc-900/50'),
        (r'\bbg-zinc-100\b(?!\s*dark:bg-)', r'bg-zinc-100 dark:bg-zinc-800'),
        (r'\bbg-zinc-200\b(?!\s*dark:bg-)', r'bg-zinc-200 dark:bg-zinc-700'),
        (r'\bbg-zinc-300\b(?!\s*dark:bg-)', r'bg-zinc-300 dark:bg-zinc-600'),
        (r'\bbg-slate-100\b(?!\s*dark:bg-)', r'bg-slate-100 dark:bg-zinc-950'),
        (r'\bbg-emerald-50\b(?!\s*dark:bg-)', r'bg-emerald-50 dark:bg-emerald-950/30'),
        (r'\bbg-amber-50\b(?!\s*dark:bg-)', r'bg-amber-50 dark:bg-amber-950/30'),
        (r'\bbg-blue-50\b(?!\s*dark:bg-)', r'bg-blue-50 dark:bg-blue-950/30'),
        (r'\bbg-red-50\b(?!\s*dark:bg-)', r'bg-red-50 dark:bg-red-950/30'),
        (r'\bbg-emerald-950/5\b(?!\s*dark:bg-)', r'bg-emerald-950/5 dark:bg-emerald-400/5'),
        (r'\bbg-zinc-950/5\b(?!\s*dark:bg-)', r'bg-zinc-950/5 dark:bg-white/5'),
        
        # Text
        (r'\btext-zinc-950\b(?!\s*dark:text-)', r'text-zinc-950 dark:text-zinc-50'),
        (r'\btext-zinc-900\b(?!\s*dark:text-)', r'text-zinc-900 dark:text-zinc-100'),
        (r'\btext-zinc-800\b(?!\s*dark:text-)', r'text-zinc-800 dark:text-zinc-200'),
        (r'\btext-zinc-700\b(?!\s*dark:text-)', r'text-zinc-700 dark:text-zinc-300'),
        (r'\btext-zinc-600\b(?!\s*dark:text-)', r'text-zinc-600 dark:text-zinc-400'),
        (r'\btext-zinc-500\b(?!\s*dark:text-)', r'text-zinc-500 dark:text-zinc-400'),
        (r'\btext-slate-500\b(?!\s*dark:text-)', r'text-slate-500 dark:text-slate-400'),
        (r'\btext-emerald-700\b(?!\s*dark:text-)', r'text-emerald-700 dark:text-emerald-400'),
        (r'\btext-emerald-600\b(?!\s*dark:text-)', r'text-emerald-600 dark:text-emerald-500'),
        (r'\btext-amber-700\b(?!\s*dark:text-)', r'text-amber-700 dark:text-amber-400'),
        (r'\btext-blue-700\b(?!\s*dark:text-)', r'text-blue-700 dark:text-blue-400'),
        (r'\btext-red-700\b(?!\s*dark:text-)', r'text-red-700 dark:text-red-400'),
        
        # Borders
        (r'\bborder-slate-200\b(?!\s*dark:border-)', r'border-slate-200 dark:border-zinc-800'),
        (r'\bborder-zinc-200\b(?!\s*dark:border-)', r'border-zinc-200 dark:border-zinc-800'),
        (r'\bborder-zinc-100\b(?!\s*dark:border-)', r'border-zinc-100 dark:border-zinc-800'),
        (r'\bborder-emerald-200\b(?!\s*dark:border-)', r'border-emerald-200 dark:border-emerald-800/50'),
        (r'\bborder-amber-200\b(?!\s*dark:border-)', r'border-amber-200 dark:border-amber-800/50'),
        (r'\bborder-blue-200\b(?!\s*dark:border-)', r'border-blue-200 dark:border-blue-800/50'),
        (r'\bborder-red-200\b(?!\s*dark:border-)', r'border-red-200 dark:border-red-800/50'),
        
        # Rings
        (r'\bring-slate-200\b(?!\s*dark:ring-)', r'ring-slate-200 dark:ring-zinc-800'),
        (r'\bring-zinc-200\b(?!\s*dark:ring-)', r'ring-zinc-200 dark:ring-zinc-800'),
        (r'\bring-emerald-200\b(?!\s*dark:ring-)', r'ring-emerald-200 dark:ring-emerald-800/50'),
        
        # Hovers
        (r'\bhover:bg-zinc-100\b(?!\s*dark:hover:bg-)', r'hover:bg-zinc-100 dark:hover:bg-zinc-800'),
        (r'\bhover:bg-emerald-100\b(?!\s*dark:hover:bg-)', r'hover:bg-emerald-100 dark:hover:bg-emerald-900/50'),
        (r'\bhover:bg-amber-100\b(?!\s*dark:hover:bg-)', r'hover:bg-amber-100 dark:hover:bg-amber-900/50'),
        (r'\bhover:bg-blue-100\b(?!\s*dark:hover:bg-)', r'hover:bg-blue-100 dark:hover:bg-blue-900/50'),
        (r'\bhover:bg-slate-100\b(?!\s*dark:hover:bg-)', r'hover:bg-slate-100 dark:hover:bg-zinc-800'),
        
        # Gradients
        (r'\bfrom-slate-50\b(?!\s*dark:from-)', r'from-slate-50 dark:from-zinc-950'),
        (r'\bvia-white\b(?!\s*dark:via-)', r'via-white dark:via-zinc-900'),
        (r'\bto-slate-100\b(?!\s*dark:to-)', r'to-slate-100 dark:to-zinc-950'),
        
        # Placeholders
        (r'\bplaceholder:text-zinc-400\b(?!\s*dark:placeholder:)', r'placeholder:text-zinc-400 dark:placeholder:text-zinc-500'),
    ]

    new_content = content
    for pattern, rep in replacements:
        new_content = re.sub(pattern, rep, new_content)

    if new_content != content:
        with open(filepath, 'w') as f:
            f.write(new_content)
        print(f"Updated {filepath}")

for root, _, files in os.walk('components'):
    for f in files:
        if f.endswith('.tsx') or f.endswith('.ts'):
            process_file(os.path.join(root, f))
