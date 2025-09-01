import { Inject, Injectable } from '@angular/core';
import { EVAL_SERVICE, EvalService } from '../../core/services/eval.service';
import { EvalCase } from '../eval-tab/eval-tab.component';

@Injectable({ providedIn: 'root' })
export class ChatEvalService {
  constructor(@Inject(EVAL_SERVICE) private evalService: EvalService) {}

  editEvalCaseMessage(ctx: any, message: any) {
    ctx.isEvalCaseEditing.set(true);
    ctx.userEditEvalCaseMessage = message.text;
    message.isEditing = true;
    setTimeout(() => {
      ctx.textarea?.nativeElement.focus();
      let textLength = ctx.textarea?.nativeElement.value.length;
      if (message.text.charAt(textLength - 1) === '\n') {
        textLength--;
      }
      ctx.textarea?.nativeElement.setSelectionRange(textLength, textLength);
    }, 0);
  }

  saveEvalCase(ctx: any) {
    ctx.evalService
      .updateEvalCase(ctx.appName, ctx.evalSetId, ctx.updatedEvalCase!.evalId, ctx.updatedEvalCase!)
      .subscribe(() => {
        ctx.openSnackBar('Eval case updated', 'OK');
        this.resetEditEvalCaseVars(ctx);
      });
  }

  cancelEditEvalCase(ctx: any) {
    this.resetEditEvalCaseVars(ctx);
    ctx.updateWithSelectedEvalCase(ctx.evalCase!);
  }

  resetEditEvalCaseVars(ctx: any) {
    ctx.hasEvalCaseChanged.set(false);
    ctx.isEvalCaseEditing.set(false);
    ctx.isEvalEditMode.set(false);
    ctx.updatedEvalCase = null;
  }

  saveEditMessage(ctx: any, message: any) {
    ctx.hasEvalCaseChanged.set(true);
    ctx.isEvalCaseEditing.set(false);
    message.isEditing = false;
    message.text = ctx.userEditEvalCaseMessage ? ctx.userEditEvalCaseMessage : ' ';
    ctx.updatedEvalCase = structuredClone(ctx.evalCase!);
    ctx.updatedEvalCase!.conversation[message.invocationIndex].finalResponse!.parts![message.finalResponsePartIndex] = { text: ctx.userEditEvalCaseMessage };
    ctx.userEditEvalCaseMessage = '';
  }

  deleteEvalCaseMessage(ctx: any, message: any, index: number) {
    ctx.hasEvalCaseChanged.set(true);
    ctx.messages.splice(index, 1);
    ctx.messagesSubject.next(ctx.messages);
    ctx.updatedEvalCase = structuredClone(ctx.evalCase!);
    ctx.updatedEvalCase!.conversation[message.invocationIndex].finalResponse!.parts!.splice(message.finalResponsePartIndex, 1);
  }

  updateWithSelectedEvalCase(ctx: any, evalCase: EvalCase) {
    ctx.evalCase = evalCase;
    ctx.isChatMode.set(false);

    ctx.resetEventsAndMessages();
    let index = 0;
    let invocationIndex = 0;

    for (const invocation of evalCase.conversation) {
      if (invocation.userContent?.parts) {
        for (const part of invocation.userContent.parts) {
          ctx.storeMessage(part, null, index, 'user');
          index++;
        }
      }

      if (invocation.intermediateData?.toolUses) {
        let toolUseIndex = 0;
        for (const toolUse of invocation.intermediateData.toolUses) {
          const functionCallPart = { functionCall: { name: toolUse.name, args: toolUse.args } };
          ctx.storeMessage(functionCallPart, null, index, 'bot', invocationIndex, { toolUseIndex });
          index++;
          toolUseIndex++;

          const functionResponsePart = { functionResponse: { name: toolUse.name } };
          ctx.storeMessage(functionResponsePart, null, index, 'bot');
          index++;
        }
      }

      if (invocation.finalResponse?.parts) {
        let finalResponsePartIndex = 0;
        for (const part of invocation.finalResponse.parts) {
          ctx.storeMessage(part, null, index, 'bot', invocationIndex, { finalResponsePartIndex });
          index++;
          finalResponsePartIndex++;
        }
      }
      invocationIndex++;
    }
  }
}


