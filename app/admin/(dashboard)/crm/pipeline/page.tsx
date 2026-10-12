import { PipelineClientLoader } from "./pipeline-client-loader";

export default function PipelinePage() {
  return (
    <div className="p-6 space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-lg font-semibold text-foreground">Pipeline</h2>
          <p className="text-sm text-muted-foreground">
            Drag and drop deals between stages to update their progress
          </p>
        </div>
      </div>

      <PipelineClientLoader />
    </div>
  );
}
