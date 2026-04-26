import { ReactFlowProvider } from "@xyflow/react";
import WorkflowCanvas from "@/components/canvas/WorkflowCanvas";

type WorkflowPageProps = {
  params: {
    id: string;
  };
};

export default function WorkflowPage({ params }: WorkflowPageProps) {
  return (
    <section className="h-screen min-h-screen bg-[#111111]">
      <ReactFlowProvider>
        <WorkflowCanvas workflowId={params.id} />
      </ReactFlowProvider>
    </section>
  );
}
