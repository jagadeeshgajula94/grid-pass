import type { ReactElement } from "react";
import type { StationDto } from "../../domain/station";
import { connectorLabel, STATUS_COLORS } from "./station-display";
export function StationPorts({
  station,
}: {
  station: StationDto;
}): ReactElement {
  return (
    <>
      <h3>Charging ports</h3>
      <div className="port-list">
        {station.connectors.map((port, index) => (
          <div className="port-row" key={`${port.type}-${index}`}>
            <span
              className="status-dot"
              style={{ backgroundColor: STATUS_COLORS[port.status] }}
              aria-label={port.status}
            />
            <div>
              <strong>
                {connectorLabel(port.type)} · {port.powerKw} kW
              </strong>
              <small>{port.status}</small>
            </div>
            <span>
              {port.tariffInrPerKwh === null
                ? "Tariff n/a"
                : `₹${port.tariffInrPerKwh}/kWh`}
            </span>
          </div>
        ))}
      </div>
    </>
  );
}
