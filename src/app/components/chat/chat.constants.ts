import { MatPaginatorIntl } from '@angular/material/paginator';

export const ROOT_AGENT = 'root_agent';

export const BIDI_STREAMING_RESTART_WARNING =
  'Restarting bidirectional streaming is not currently supported. Please refresh the page or start a new session.';

export const LLM_REQUEST_KEY = 'gcp.vertex.agent.llm_request';
export const LLM_RESPONSE_KEY = 'gcp.vertex.agent.llm_response';

export class CustomPaginatorIntl extends MatPaginatorIntl {
  override nextPageLabel = 'Next Event';
  override previousPageLabel = 'Previous Event';
  override firstPageLabel = 'First Event';
  override lastPageLabel = 'Last Event';

  override getRangeLabel = (page: number, pageSize: number, length: number) => {
    if (length === 0) {
      return `Event 0 of ${length}`;
    }

    length = Math.max(length, 0);
    const startIndex = page * pageSize;

    return `Event ${startIndex + 1} of ${length}`;
  };
}


