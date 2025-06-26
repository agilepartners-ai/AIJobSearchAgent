import {
  AnimatedTextBlockWrapper,
  DialogWrapper,
} from "@/components/DialogWrapper";
import { grid } from 'ldrs';

grid.register();

export const ConversationLoading: React.FC = () => {
  return (
    <DialogWrapper>
      <AnimatedTextBlockWrapper>
        <div className="flex size-full items-center justify-center">
          <l-grid size="60" speed="1.5" color="black"></l-grid>
        </div>
      </AnimatedTextBlockWrapper>
    </DialogWrapper>
  );
};
