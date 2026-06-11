import json

transcript_path = '/home/bernard/.gemini/antigravity/brain/12ed1987-0aeb-4849-bcbd-ea18dd26e337/.system_generated/logs/transcript.jsonl'

with open(transcript_path, 'r') as f:
    for line in f:
        try:
            entry = json.loads(line)
            if entry.get('type') == 'PLANNER_RESPONSE':
                for tool_call in entry.get('tool_calls', []):
                    if tool_call.get('name') == 'write_to_file':
                        args = tool_call.get('args', {})
                        print("write_to_file target:", args.get('TargetFile', ''))
        except Exception as e:
            pass
