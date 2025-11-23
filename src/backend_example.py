"""
Complete Python Backend Example for Chat With Me
=================================================

This is a complete working backend using Flask and SQLite.

Installation:
pip install flask flask-cors PyPDF2

Usage:
python backend_example.py

Then your frontend will connect to http://localhost:8000
"""

from flask import Flask, request, jsonify
from flask_cors import CORS
import sqlite3
import uuid
from datetime import datetime
import os
from werkzeug.utils import secure_filename
import PyPDF2

app = Flask(__name__)
CORS(app)  # Enable CORS for all routes

# Configuration
UPLOAD_FOLDER = 'uploads'
DATABASE = 'chatdb.sqlite'
ALLOWED_EXTENSIONS = {'pdf'}

os.makedirs(UPLOAD_FOLDER, exist_ok=True)

# Initialize Database
def init_db():
    conn = sqlite3.connect(DATABASE)
    cursor = conn.cursor()
    
    # Create sessions table
    cursor.execute('''
        CREATE TABLE IF NOT EXISTS sessions (
            id TEXT PRIMARY KEY,
            name TEXT NOT NULL,
            mode TEXT NOT NULL CHECK(mode IN ('chat', 'pdf')),
            pdf_id TEXT,
            created_at TEXT NOT NULL,
            updated_at TEXT NOT NULL
        )
    ''')
    
    # Create messages table
    cursor.execute('''
        CREATE TABLE IF NOT EXISTS messages (
            id TEXT PRIMARY KEY,
            session_id TEXT NOT NULL,
            role TEXT NOT NULL CHECK(role IN ('user', 'assistant')),
            content TEXT NOT NULL,
            timestamp TEXT NOT NULL,
            FOREIGN KEY (session_id) REFERENCES sessions(id) ON DELETE CASCADE
        )
    ''')
    
    # Create pdfs table
    cursor.execute('''
        CREATE TABLE IF NOT EXISTS pdfs (
            id TEXT PRIMARY KEY,
            filename TEXT NOT NULL,
            number_of_chunks INTEGER NOT NULL,
            upload_date TEXT NOT NULL
        )
    ''')
    
    # Create pdf_chunks table for RAG
    cursor.execute('''
        CREATE TABLE IF NOT EXISTS pdf_chunks (
            id INTEGER PRIMARY KEY AUTOINCREMENT,
            pdf_id TEXT NOT NULL,
            chunk_index INTEGER NOT NULL,
            content TEXT NOT NULL,
            FOREIGN KEY (pdf_id) REFERENCES pdfs(id) ON DELETE CASCADE
        )
    ''')
    
    conn.commit()
    conn.close()

def get_db():
    conn = sqlite3.connect(DATABASE)
    conn.row_factory = sqlite3.Row
    return conn

def allowed_file(filename):
    return '.' in filename and filename.rsplit('.', 1)[1].lower() in ALLOWED_EXTENSIONS

def extract_pdf_text(pdf_path):
    """Extract text from PDF and split into chunks"""
    chunks = []
    
    try:
        with open(pdf_path, 'rb') as file:
            pdf_reader = PyPDF2.PdfReader(file)
            
            for page_num in range(len(pdf_reader.pages)):
                page = pdf_reader.pages[page_num]
                text = page.extract_text()
                
                # Simple chunking: split by paragraphs or every ~500 characters
                # In production, use better chunking strategies
                if text:
                    # Split by double newlines (paragraphs)
                    paragraphs = text.split('\n\n')
                    for para in paragraphs:
                        if len(para.strip()) > 50:  # Only keep meaningful chunks
                            chunks.append(para.strip())
    
    except Exception as e:
        print(f"Error extracting PDF: {e}")
    
    return chunks

def simple_retrieve_chunks(query, pdf_id, top_k=3):
    """
    Simple retrieval: returns chunks that contain query words
    In production, use proper embeddings and vector search
    """
    conn = get_db()
    cursor = conn.cursor()
    
    # Get all chunks for this PDF
    cursor.execute(
        "SELECT content FROM pdf_chunks WHERE pdf_id = ?",
        (pdf_id,)
    )
    rows = cursor.fetchall()
    conn.close()
    
    if not rows:
        return []
    
    # Simple keyword matching (in production, use embeddings)
    query_words = set(query.lower().split())
    scored_chunks = []
    
    for row in rows:
        content = row['content']
        content_words = set(content.lower().split())
        
        # Calculate overlap score
        overlap = len(query_words & content_words)
        if overlap > 0:
            scored_chunks.append((overlap, content))
    
    # Sort by score and return top_k
    scored_chunks.sort(reverse=True, key=lambda x: x[0])
    return [chunk for _, chunk in scored_chunks[:top_k]]

# ==================== ROUTES ====================

@app.route('/upload-pdf', methods=['POST'])
def upload_pdf():
    """Upload and process PDF file"""
    if 'file' not in request.files:
        return jsonify({'error': 'No file provided'}), 400
    
    file = request.files['file']
    
    if file.filename == '':
        return jsonify({'error': 'No file selected'}), 400
    
    if not allowed_file(file.filename):
        return jsonify({'error': 'Invalid file type. Only PDF allowed'}), 400
    
    try:
        # Save file
        filename = secure_filename(file.filename)
        pdf_id = str(uuid.uuid4())
        filepath = os.path.join(UPLOAD_FOLDER, f"{pdf_id}.pdf")
        file.save(filepath)
        
        # Extract text and create chunks
        chunks = extract_pdf_text(filepath)
        
        if not chunks:
            return jsonify({'error': 'Could not extract text from PDF'}), 400
        
        # Save to database
        conn = get_db()
        cursor = conn.cursor()
        
        now = datetime.utcnow().isoformat() + 'Z'
        
        cursor.execute(
            "INSERT INTO pdfs (id, filename, number_of_chunks, upload_date) VALUES (?, ?, ?, ?)",
            (pdf_id, filename, len(chunks), now)
        )
        
        # Save chunks
        for idx, chunk in enumerate(chunks):
            cursor.execute(
                "INSERT INTO pdf_chunks (pdf_id, chunk_index, content) VALUES (?, ?, ?)",
                (pdf_id, idx, chunk)
            )
        
        conn.commit()
        conn.close()
        
        return jsonify({
            'pdf_id': pdf_id,
            'number_of_chunks': len(chunks)
        })
    
    except Exception as e:
        print(f"Error processing PDF: {e}")
        return jsonify({'error': 'Failed to process PDF'}), 500

@app.route('/retrieve', methods=['POST'])
def retrieve():
    """Retrieve relevant chunks for RAG"""
    data = request.json
    query = data.get('query')
    pdf_id = data.get('pdf_id')
    
    if not query or not pdf_id:
        return jsonify({'error': 'Missing query or pdf_id'}), 400
    
    try:
        chunks = simple_retrieve_chunks(query, pdf_id)
        
        if not chunks:
            # Return empty chunks if nothing found
            chunks = ["No relevant content found in the PDF."]
        
        return jsonify({'chunks': chunks})
    
    except Exception as e:
        print(f"Error retrieving chunks: {e}")
        return jsonify({'error': 'Failed to retrieve chunks'}), 500

@app.route('/chat', methods=['POST'])
def chat():
    """General chat endpoint (frontend handles LLM via Puter.js)"""
    data = request.json
    query = data.get('query')
    session_id = data.get('session_id')
    
    if not query or not session_id:
        return jsonify({'error': 'Missing query or session_id'}), 400
    
    # Frontend handles LLM, so just acknowledge
    message_id = str(uuid.uuid4())
    
    return jsonify({
        'response': 'Acknowledged',
        'message_id': message_id
    })

@app.route('/sessions', methods=['GET', 'POST'])
def sessions():
    """Get all sessions or create new session"""
    
    if request.method == 'GET':
        # Get all sessions
        conn = get_db()
        cursor = conn.cursor()
        
        cursor.execute(
            "SELECT id, name, mode, pdf_id, created_at, updated_at FROM sessions ORDER BY updated_at DESC"
        )
        rows = cursor.fetchall()
        conn.close()
        
        sessions_list = []
        for row in rows:
            sessions_list.append({
                'id': row['id'],
                'name': row['name'],
                'mode': row['mode'],
                'pdf_id': row['pdf_id'],
                'created_at': row['created_at'],
                'updated_at': row['updated_at']
            })
        
        return jsonify({'sessions': sessions_list})
    
    else:  # POST
        # Create new session
        data = request.json
        name = data.get('name')
        mode = data.get('mode')
        pdf_id = data.get('pdf_id')
        
        if not name or not mode or mode not in ['chat', 'pdf']:
            return jsonify({'error': 'Invalid data'}), 400
        
        session_id = str(uuid.uuid4())
        now = datetime.utcnow().isoformat() + 'Z'
        
        conn = get_db()
        cursor = conn.cursor()
        
        cursor.execute(
            "INSERT INTO sessions (id, name, mode, pdf_id, created_at, updated_at) VALUES (?, ?, ?, ?, ?, ?)",
            (session_id, name, mode, pdf_id, now, now)
        )
        
        conn.commit()
        conn.close()
        
        return jsonify({
            'id': session_id,
            'name': name,
            'mode': mode,
            'pdf_id': pdf_id,
            'created_at': now,
            'updated_at': now
        }), 201

@app.route('/sessions/<session_id>', methods=['DELETE'])
def delete_session_route(session_id):
    """Delete a session"""
    conn = get_db()
    cursor = conn.cursor()
    
    # Enable foreign keys for CASCADE delete
    cursor.execute("PRAGMA foreign_keys = ON")
    
    cursor.execute("DELETE FROM sessions WHERE id = ?", (session_id,))
    
    if cursor.rowcount == 0:
        conn.close()
        return jsonify({'error': 'Session not found'}), 404
    
    conn.commit()
    conn.close()
    
    return '', 204

@app.route('/sessions/<session_id>/messages', methods=['GET'])
def get_messages(session_id):
    """Get all messages for a session"""
    conn = get_db()
    cursor = conn.cursor()
    
    cursor.execute(
        "SELECT id, session_id, role, content, timestamp FROM messages WHERE session_id = ? ORDER BY timestamp ASC",
        (session_id,)
    )
    rows = cursor.fetchall()
    conn.close()
    
    messages_list = []
    for row in rows:
        messages_list.append({
            'id': row['id'],
            'session_id': row['session_id'],
            'role': row['role'],
            'content': row['content'],
            'timestamp': row['timestamp']
        })
    
    return jsonify({'messages': messages_list})

@app.route('/messages', methods=['POST'])
def save_message_route():
    """Save a message"""
    data = request.json
    session_id = data.get('session_id')
    role = data.get('role')
    content = data.get('content')
    
    if not session_id or not role or not content or role not in ['user', 'assistant']:
        return jsonify({'error': 'Invalid data'}), 400
    
    message_id = str(uuid.uuid4())
    now = datetime.utcnow().isoformat() + 'Z'
    
    conn = get_db()
    cursor = conn.cursor()
    
    cursor.execute(
        "INSERT INTO messages (id, session_id, role, content, timestamp) VALUES (?, ?, ?, ?, ?)",
        (message_id, session_id, role, content, now)
    )
    
    # Update session's updated_at
    cursor.execute(
        "UPDATE sessions SET updated_at = ? WHERE id = ?",
        (now, session_id)
    )
    
    conn.commit()
    conn.close()
    
    return jsonify({
        'id': message_id,
        'session_id': session_id,
        'role': role,
        'content': content,
        'timestamp': now
    }), 201

@app.route('/')
def index():
    """Health check"""
    return jsonify({
        'status': 'running',
        'message': 'Chat With Me Backend API',
        'version': '1.0.0'
    })

if __name__ == '__main__':
    print("Initializing database...")
    init_db()
    print("Database initialized!")
    print("\nStarting Flask server on http://localhost:8000")
    print("Make sure to update your frontend's API_BASE_URL to http://localhost:8000\n")
    
    app.run(host='0.0.0.0', port=8000, debug=True)
