
import re

def check_balance(filename):
    with open(filename, 'r') as f:
        lines = f.readlines()

    stack = []
    
    # Simple tokenizer matching braces, brackets, parens
    # Ignore strings and comments for simplicity (or use a smarter regex)
    
    for i, line in enumerate(lines):
        line_num = i + 1
        # Strip comments roughly (// ...)
        content = line.split('//')[0]
        
        # Iterate chars
        for char in content:
            if char in '{[(':
                stack.append((char, line_num))
            elif char in '}])':
                if not stack:
                    print(f"Error: Unmatched '{char}' at line {line_num}")
                    return
                
                last_char, last_line = stack.pop()
                expected = {'}': '{', ']': '[', ')': '('}[char]
                
                if last_char != expected:
                    print(f"Error: Mismatched '{char}' at line {line_num}. Expected matching closing for '{last_char}' from line {last_line}")
                    return

    if stack:
        print("Error: Unclosed containers:")
        for char, line_num in stack: # Limit output if huge
             print(f"  '{char}' from line {line_num}")
    else:
        print("Success: All braces balanced.")

check_balance('web/app/dashboard/page.tsx')
