import os
import re

directories = [
    '/Users/devanshbehl/Documents/Code/Ipay/web-demo',
    '/Users/devanshbehl/Documents/Code/Ipay/mobile-app'
]

replacements = {
    r'(?i)#D4FF00': '#FFFFFF',
    r'(?i)#E2FF46': '#E5E5E5',
    r'(?i)#b6e000': '#222222',
    r'(?i)#8fb400': '#111111'
}

# In index.css for web-demo
# background: linear-gradient(135deg, #d4ff00 0%, #b6e000 45%, #8fb400 100%);
# It will be replaced naturally by the above regex, wait: #d4ff00 -> #FFFFFF
# So it becomes linear-gradient(135deg, #FFFFFF 0%, #222222 45%, #111111 100%);
# This would look weird for a card. Let's fix the web-demo card explicitly.

def process_file(filepath):
    with open(filepath, 'r') as f:
        content = f.read()

    original_content = content

    # Specific replacements
    if 'index.css' in filepath:
        content = re.sub(r'linear-gradient\(135deg,\s*#[a-fA-F0-9]+\s*0%,\s*#[a-fA-F0-9]+\s*45%,\s*#[a-fA-F0-9]+\s*100%\)',
                         r'linear-gradient(135deg, #444444 0%, #222222 45%, #111111 100%)', content)
        content = re.sub(r'rgba\(212,\s*255,\s*0,', r'rgba(255, 255, 255,', content)

    if 'HomeScreen.tsx' in filepath:
        content = re.sub(
            r"const CARD_GRADIENTS: \{ colors: \[string, string, \.\.\.string\[\]\] \} \[\] = \[\s*\{ colors: \['#[^']+', '#[^']+'\] \},\s*\{ colors: \['#[^']+', '#[^']+'\] \},\s*\{ colors: \['#[^']+', '#[^']+'\] \},\s*\{ colors: \['#[^']+', '#[^']+'\] \},\s*\{ colors: \['#[^']+', '#[^']+'\] \},\s*\];",
            """const CARD_GRADIENTS: { colors: [string, string, ...string[]] }[] = [
    { colors: ['#444444', '#111111'] },
    { colors: ['#555555', '#222222'] },
    { colors: ['#666666', '#333333'] },
    { colors: ['#333333', '#000000'] },
    { colors: ['#777777', '#444444'] },
  ];""",
            content,
            flags=re.MULTILINE
        )

    # General replacements
    for pattern, repl in replacements.items():
        content = re.sub(pattern, repl, content)

    # Also fix rgba(212,255,0,0.5) etc to rgba(255,255,255,0.5)
    content = re.sub(r'rgba\(212,\s*255,\s*0,\s*([0-9.]+)\)', r'rgba(255,255,255,\1)', content)

    if content != original_content:
        with open(filepath, 'w') as f:
            f.write(content)
        print(f"Updated {filepath}")

for d in directories:
    for root, dirs, files in os.walk(d):
        if 'node_modules' in root or '.git' in root or '.expo' in root or 'dist' in root:
            continue
        for file in files:
            if file.endswith(('.tsx', '.ts', '.css', '.js', '.jsx')):
                process_file(os.path.join(root, file))

