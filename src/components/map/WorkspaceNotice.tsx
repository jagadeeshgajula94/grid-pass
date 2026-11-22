import type { ReactElement } from "react";
export function WorkspaceNotice({
  loading,
  error,
}: {
  loading: boolean;
  error: string;
}): ReactElement {
  return (
    <>
      {loading && (
        <div className="map-notice glass" role="status">
          Finding your next charge…
        </div>
      )}
      {error && (
        <div className="map-notice glass" role="alert">
          {error}
        </div>
      )}
    </>
  );
}
