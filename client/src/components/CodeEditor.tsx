import { useState, useEffect, useRef } from 'react';
import Editor from '@monaco-editor/react';
import { Socket } from 'socket.io-client';
import { submitCode } from '../services/api';

interface Props {
  socket: Socket;
  interviewId: string;
}

const LANGUAGES = [
  { value: 'javascript', label: 'JavaScript' },
  { value: 'python', label: 'Python' },
  { value: 'java', label: 'Java' },
  { value: 'cpp', label: 'C++' },
];

const DEFAULT_CODE: Record<string, string> = {
  javascript: '// Write your JavaScript code here\nconsole.log("Hello, World!");\n',
  python: '# Write your Python code here\nprint("Hello, World!")\n',
  java: '// Write your Java code here\npublic class Main {\n    public static void main(String[] args) {\n        System.out.println("Hello, World!");\n    }\n}\n',
  cpp: '// Write your C++ code here\n#include <iostream>\nusing namespace std;\n\nint main() {\n    cout << "Hello, World!" << endl;\n    return 0;\n}\n',
};

export default function CodeEditor({ socket, interviewId }: Props) {
  const [language, setLanguage] = useState('javascript');
  const [code, setCode] = useState(DEFAULT_CODE['javascript']);
  const [output, setOutput] = useState('');
  const [isRunning, setIsRunning] = useState(false);
  const isRemoteChange = useRef(false);

  useEffect(() => {
    socket.on('code-change', (data: { code: string; language: string }) => {
      isRemoteChange.current = true;
      setCode(data.code);
      setLanguage(data.language);
    });
    return () => { socket.off('code-change'); };
  }, [socket]);

  const handleCodeChange = (value: string | undefined) => {
    const newCode = value || '';
    setCode(newCode);
    if (!isRemoteChange.current) {
      socket.emit('code-change', { interviewId, code: newCode, language });
    }
    isRemoteChange.current = false;
  };

  const handleLanguageChange = (newLang: string) => {
    setLanguage(newLang);
    const newCode = DEFAULT_CODE[newLang] || '';
    setCode(newCode);
    socket.emit('code-change', { interviewId, code: newCode, language: newLang });
  };

  const handleRun = async () => {
    setIsRunning(true);
    setOutput('Running...');
    try {
      const { data } = await submitCode({ interviewId, language, code });
      setOutput(data.output || 'No output');
    } catch (err: any) {
      setOutput(`Error: ${err.response?.data?.message || err.message}`);
    } finally {
      setIsRunning(false);
    }
  };

  return (
    <div className="flex flex-col h-full">
      <div className="flex items-center justify-between px-3 py-2 bg-gray-100 dark:bg-gray-800 rounded-t-lg border-b border-gray-200 dark:border-gray-700">
        <select
          value={language}
          onChange={(e) => handleLanguageChange(e.target.value)}
          className="px-3 py-1.5 text-sm bg-white dark:bg-gray-700 border border-gray-300 dark:border-gray-600 rounded-lg text-gray-700 dark:text-gray-200"
        >
          {LANGUAGES.map((l) => (
            <option key={l.value} value={l.value}>{l.label}</option>
          ))}
        </select>
        <button
          onClick={handleRun}
          disabled={isRunning}
          className="px-4 py-1.5 text-sm font-medium bg-green-600 text-white rounded-lg hover:bg-green-700 disabled:opacity-50 disabled:cursor-not-allowed flex items-center space-x-1"
        >
          {isRunning ? (
            <svg className="w-4 h-4 animate-spin" fill="none" viewBox="0 0 24 24">
              <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
              <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z" />
            </svg>
          ) : (
            <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M14.752 11.168l-3.197-2.132A1 1 0 0010 9.87v4.263a1 1 0 001.555.832l3.197-2.132a1 1 0 000-1.664z" />
            </svg>
          )}
          <span>{isRunning ? 'Running...' : 'Run'}</span>
        </button>
      </div>

      <div className="flex-1 min-h-0">
        <Editor
          height="100%"
          language={language === 'cpp' ? 'cpp' : language}
          value={code}
          onChange={handleCodeChange}
          theme="vs-dark"
          options={{
            minimap: { enabled: false },
            fontSize: 14,
            lineNumbers: 'on',
            scrollBeyondLastLine: false,
            automaticLayout: true,
            tabSize: 2,
            wordWrap: 'on',
          }}
        />
      </div>

      <div className="bg-gray-900 text-green-400 p-3 rounded-b-lg font-mono text-sm max-h-40 overflow-y-auto">
        <div className="text-gray-500 text-xs mb-1">Output:</div>
        <pre className="whitespace-pre-wrap">{output || 'Click "Run" to execute code'}</pre>
      </div>
    </div>
  );
}
