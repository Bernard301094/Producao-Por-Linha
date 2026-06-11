import json

transcript_path = '/home/bernard/.gemini/antigravity/brain/12ed1987-0aeb-4849-bcbd-ea18dd26e337/.system_generated/logs/transcript.jsonl'
app_tsx_path = '/home/bernard/Producao-Por-Linha/src/App.tsx'

last_content = None

with open(transcript_path, 'r') as f:
    for line in f:
        try:
            entry = json.loads(line)
            if entry.get('type') == 'PLANNER_RESPONSE':
                for tool_call in entry.get('tool_calls', []):
                    if tool_call.get('name') == 'write_to_file':
                        args = tool_call.get('args', {})
                        target = args.get('TargetFile', '')
                        if 'App.tsx' in target:
                            last_content = args.get('CodeContent')
        except Exception as e:
            continue

if last_content:
    with open(app_tsx_path, 'w') as f:
        f.write(last_content)
    print("Successfully restored App.tsx from the transcript!")
else:
    print("Could not find App.tsx in transcript.")
