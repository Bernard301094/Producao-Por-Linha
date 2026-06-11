import os
import re

def process_file(filepath):
    with open(filepath, 'r') as f:
        content = f.read()

    # Replacements: (pattern, replacement)
    replacements = [
        (r'\bbg-white\b(?!\s*dark:bg-)', r'bg-white dark:bg-zinc-950'),
        (r'\bbg-slate-50\b(?!\s*dark:bg-)', r'bg-slate-50 dark:bg-zinc-900'),
        (r'\bbg-zinc-50\b(?!\s*dark:bg-)', r'bg-zinc-50 dark:bg-zinc-900/50'),
        (r'\bbg-zinc-100\b(?!\s*dark:bg-)', r'bg-zinc-100 dark:bg-zinc-800'),
        (r'\btext-zinc-900\b(?!\s*dark:text-)', r'text-zinc-900 dark:text-zinc-100'),
        (r'\btext-zinc-800\b(?!\s*dark:text-)', r'text-zinc-800 dark:text-zinc-200'),
        (r'\btext-zinc-700\b(?!\s*dark:text-)', r'text-zinc-700 dark:text-zinc-300'),
        (r'\btext-zinc-600\b(?!\s*dark:text-)', r'text-zinc-600 dark:text-zinc-400'),
        (r'\btext-zinc-500\b(?!\s*dark:text-)', r'text-zinc-500 dark:text-zinc-400'),
        (r'\btext-slate-500\b(?!\s*dark:text-)', r'text-slate-500 dark:text-zinc-400'),
        (r'\bborder-slate-200\b(?!\s*dark:border-)', r'border-slate-200 dark:border-zinc-800'),
        (r'\bborder-zinc-200\b(?!\s*dark:border-)', r'border-zinc-200 dark:border-zinc-800'),
        (r'\bborder-zinc-100\b(?!\s*dark:border-)', r'border-zinc-100 dark:border-zinc-800'),
        (r'\bring-slate-200\b(?!\s*dark:ring-)', r'ring-slate-200 dark:ring-zinc-800'),
        (r'\bring-zinc-200\b(?!\s*dark:ring-)', r'ring-zinc-200 dark:ring-zinc-800'),
        (r'\bplaceholder:text-zinc-400\b(?!\s*dark:placeholder:)', r'placeholder:text-zinc-400 dark:placeholder:text-zinc-500'),
    ]

    new_content = content
    for pattern, rep in replacements:
        new_content = re.sub(pattern, rep, new_content)

    if new_content != content:
        with open(filepath, 'w') as f:
            f.write(new_content)
        print(f"Updated {filepath}")

for root, _, files in os.walk('src'):
    for f in files:
        if f.endswith('.tsx'):
            process_file(os.path.join(root, f))
