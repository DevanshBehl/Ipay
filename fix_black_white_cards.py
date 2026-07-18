import os
import re

directories = [
    '/Users/devanshbehl/Documents/Code/Ipay/web-demo',
    '/Users/devanshbehl/Documents/Code/Ipay/mobile-app'
]

# Greys to perfect black and white
replacements = {
    r'(?i)#161618': '#000000',
    r'(?i)#282A31': '#000000',  # maybe a bit of a border or solid black? Let's use #000000
    r'(?i)#1E2024': '#000000',
    r'(?i)#131517': '#000000',
    r'(?i)#2A2C31': '#000000',
    # We replaced some things with #E5E5E5 (hover). The user wants perfect black and white, so white.
    r'(?i)#E5E5E5': '#FFFFFF',
}

def process_file(filepath):
    with open(filepath, 'r') as f:
        content = f.read()

    original_content = content

    # Restore Cards in index.css
    if 'index.css' in filepath:
        content = re.sub(r'linear-gradient\(135deg,\s*#444444\s*0%,\s*#222222\s*45%,\s*#111111\s*100%\)',
                         r'linear-gradient(135deg, #d4ff00 0%, #b6e000 45%, #8fb400 100%)', content)
        # We previously changed rgba(212,255,0 to rgba(255,255,255, let's restore it for the card specifically
        # box-shadow: 0 20px 40px -20px rgba(255, 255, 255, 0.5), inset 0 1px 0 rgba(255, 255, 255, 0.4);
        content = re.sub(r'0 20px 40px -20px rgba\(255,\s*255,\s*255,\s*0.5\)',
                         r'0 20px 40px -20px rgba(212, 255, 0, 0.5)', content)

    # Restore Cards in HomeScreen.tsx
    if 'HomeScreen.tsx' in filepath:
        content = re.sub(
            r"const CARD_GRADIENTS: \{ colors: \[string, string, \.\.\.string\[\]\] \} \[\] = \[\s*\{ colors: \['#[^']+', '#[^']+'\] \},\s*\{ colors: \['#[^']+', '#[^']+'\] \},\s*\{ colors: \['#[^']+', '#[^']+'\] \},\s*\{ colors: \['#[^']+', '#[^']+'\] \},\s*\{ colors: \['#[^']+', '#[^']+'\] \},\s*\];",
            """const CARD_GRADIENTS: { colors: [string, string, ...string[]] }[] = [
    { colors: ['#7B2FF7', '#2196F3'] },
    { colors: ['#E63946', '#FF6B35'] },
    { colors: ['#0F2027', '#2C5364'] },
    { colors: ['#FF3366', '#FF9A56'] },
    { colors: ['#134E5E', '#71B280'] },
  ];""",
            content,
            flags=re.MULTILINE
        )

    # General replacements for grey backgrounds -> black
    for pattern, repl in replacements.items():
        content = re.sub(pattern, repl, content)

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

