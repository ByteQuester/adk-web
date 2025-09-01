export type MessageRole = string;

export interface TextPart { text: string; thought?: boolean; }
export interface InlineDataPart {
  inlineData: {
    displayName?: string;
    data: string;
    mimeType: string;
  };
}
export interface FunctionCallPart {
  functionCall: { id?: string; name: string; args: any };
}
export interface FunctionResponsePart {
  functionResponse: { name: string; response?: any };
}
export interface ExecutableCodePart {
  executableCode: { language?: string; code: string };
}
export interface CodeExecutionResultPart {
  codeExecutionResult: { outcome: string; logs?: string; output?: string };
}

export type ContentPart =
  | TextPart
  | InlineDataPart
  | FunctionCallPart
  | FunctionResponsePart
  | ExecutableCodePart
  | CodeExecutionResultPart;

export interface ChatMessage {
  role: MessageRole;
  eventId?: string;
  isLoading?: boolean;
  isEditing?: boolean;
  text?: string;
  thought?: boolean;
  renderedContent?: string;
  inlineData?: {
    name?: string;
    data: string;
    mimeType: string;
    mediaType?: string;
    displayName?: string;
  };
  functionCall?: { name: string; args: any };
  functionResponse?: { name: string; response?: any };
  executableCode?: { language?: string; code: string };
  codeExecutionResult?: { outcome: string; logs?: string; output?: string };
  attachments?: { file: File; url: string }[];
  // Eval-related optional fields used in template
  evalStatus?: number;
  failedMetric?: any;
  evalScore?: number;
  evalThreshold?: number;
  actualInvocationToolUses?: any;
  expectedInvocationToolUses?: any;
  actualFinalResponse?: any;
  expectedFinalResponse?: any;
  invocationIndex?: number;
  finalResponsePartIndex?: number;
  toolUseIndex?: number;
}

export interface ArtifactView {
  id: string;
  data: string;
  mimeType: string;
  versionId: string;
  mediaType: string;
}

export interface EventData {
  id: string;
  author?: string;
  title?: string;
  content?: { parts?: ContentPart[] };
  longRunningToolIds?: string[];
  actions?: any;
  groundingMetadata?: any;
}

export interface StreamChunk {
  id: string;
  author?: string;
  content?: { parts: ContentPart[] };
  error?: string;
  errorMessage?: string;
  groundingMetadata?: any;
}
