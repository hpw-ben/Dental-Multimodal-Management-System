import os

WORKSPACE_ROOT = r'c:\Users\Lemorica\Documents\Work_File\Graduation_Project'
OUTPUT_FILE = os.path.join(WORKSPACE_ROOT, 'SoftwareCopyrightCode.md')

ALLOWED_DIRS = [
    'frontend/app',
    'frontend/components',
    'frontend/hooks',
    'frontend/lib',
    'frontend/providers',
    'backend/users',
    'backend/patients',
    'backend/projects',
    'backend/imaging',
    'backend/annotations',
    'backend/backend'
]

EXCLUDE_DIRS = ['migrations']
ALLOWED_EXTENSIONS = ['.py', '.ts', '.tsx', '.css']

def should_process_file(filepath):
    # 检查后缀名
    if not any(filepath.endswith(ext) for ext in ALLOWED_EXTENSIONS):
        return False
    
    # 获取相对路径
    rel_path = os.path.relpath(filepath, WORKSPACE_ROOT).replace('\\', '/')
    
    # 检查是否在允许的目录中
    in_allowed = any(rel_path.startswith(d) for d in ALLOWED_DIRS)
    if not in_allowed:
        return False
    
    # 检查是否包含排除目录
    parts = rel_path.split('/')
    if any(ex in parts for ex in EXCLUDE_DIRS):
        return False
    
    # 排除 init 文件和自动生成的 manage.py 等
    if rel_path.endswith('manage.py') or rel_path.endswith('__init__.py'):
        return False
        
    return True

def ext_to_lang(ext):
    if ext == '.py': return 'python'
    if ext in ['.ts', '.tsx']: return 'typescript'
    if ext == '.js' or ext == '.jsx': return 'javascript'
    if ext == '.css': return 'css'
    return ''

total_files = 0
total_lines = 0

with open(OUTPUT_FILE, 'w', encoding='utf-8') as out_f:
    out_f.write("# 软件著作权源代码合并文档\n\n")
    
    for root, dirs, files in os.walk(WORKSPACE_ROOT):
        # 剔除明显不需要遍历的庞大目录
        dirs[:] = [d for d in dirs if d not in ['.git', 'node_modules', '.next', '.venv', '__pycache__', 'media', 'assets', '.windsurf', '.agent']]
        
        for file in files:
            filepath = os.path.join(root, file)
            if should_process_file(filepath):
                rel_path = os.path.relpath(filepath, WORKSPACE_ROOT).replace('\\', '/')
                ext = os.path.splitext(file)[1]
                
                try:
                    with open(filepath, 'r', encoding='utf-8') as in_f:
                        content = in_f.read()
                        
                    lines_count = len(content.splitlines())
                    total_files += 1
                    total_lines += lines_count
                    
                    out_f.write(content)
                    if not content.endswith('\n'):
                        out_f.write('\n')
                    out_f.write('\n')
                    
                except Exception as e:
                    print(f"无法读取文件 {filepath}: {e}")

print(f"成功将 {total_files} 个文件（共计 {total_lines} 行代码）合并生成到 {OUTPUT_FILE}")
