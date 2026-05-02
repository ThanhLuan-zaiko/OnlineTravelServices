export type HealthResponse =
  | {
      status: "ok";
      database: {
        status: "ok";
        clusterName: string | null;
        dataCenter: string | null;
        hostId: string | null;
        keyspace: string;
        releaseVersion: string | null;
      };
      latencyMs: number;
      timestamp: string;
    }
  | {
      status: "error";
      database: {
        status: "error";
        message: string;
      };
      latencyMs: number;
      timestamp: string;
    };
