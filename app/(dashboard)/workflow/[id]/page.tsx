import { ReactFlowProvider } from "@xyflow/react";
import WorkflowCanvas from "@/components/canvas/WorkflowCanvas";

type WorkflowPageProps = {
  params: {
    id: string;
  };
};

export default function WorkflowPage({ params }: WorkflowPageProps) {
  return (
    <section className="h-full min-h-[calc(100vh-56px)] bg-[var(--bg-primary)]">
      <ReactFlowProvider>
        <WorkflowCanvas workflowId={params.id} />
      </ReactFlowProvider>
    </section>
  );
}
