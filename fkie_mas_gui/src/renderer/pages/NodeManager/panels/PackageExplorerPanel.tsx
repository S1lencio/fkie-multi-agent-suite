import { RosPackage } from "@/renderer/models";
import { EventProviderState } from "@/renderer/providers/events";
import RefreshIcon from "@mui/icons-material/Refresh";
import { Alert, AlertTitle, Box, FormControl, IconButton, Stack, Tooltip } from "@mui/material";
import { useCallback, useContext, useEffect, useMemo, useState } from "react";
import { useCustomEventListener } from "react-custom-events";
import { PackageExplorer, ProviderSelector, colorFromHostname } from "../../../components";
import { RosContext } from "../../../context/RosContext";
import { SettingsContext } from "../../../context/SettingsContext";
import { ConnectionState } from "../../../providers";
import { EVENT_PROVIDER_STATE } from "../../../providers/eventTypes";

export default function PackageExplorerPanel(): JSX.Element {
  const rosCtx = useContext(RosContext);
  const settingsCtx = useContext(SettingsContext);
  const [selectedProvider, setSelectedProvider] = useState<string>("");
  const [packageList, setPackageList] = useState<RosPackage[]>([]);
  const [showReloadButton, setShowReloadButton] = useState(false);
  const [tooltipDelay, setTooltipDelay] = useState<number>(settingsCtx.get("tooltipEnterDelay") as number);
  const [backgroundColor, setBackgroundColor] = useState<string>(settingsCtx.get("backgroundColor") as string);

  useEffect(() => {
    setTooltipDelay(settingsCtx.get("tooltipEnterDelay") as number);
    setBackgroundColor(settingsCtx.get("backgroundColor") as string);
  }, [settingsCtx.changed]);

  async function updatePackageList(providerId: string, force: boolean = false): Promise<void> {
    if (!rosCtx.initialized) return;
    if (!rosCtx.providers) return;
    if (!providerId) return;
    if (providerId.length === 0) return;

    const provider = rosCtx.getProviderById(providerId);
    if (!provider) return;
    if (!provider.packages || force) {
      const pl = await provider.getPackageList();
      setPackageList(() => pl);
    } else {
      setPackageList(() => (provider.packages ? provider.packages : []));
    }
  }

  // Update files when selected provider changes
  useEffect(() => {
    if (!selectedProvider) return;
    updatePackageList(selectedProvider);
    setShowReloadButton(true);
  }, [selectedProvider, rosCtx.initialized]);

  useCustomEventListener(EVENT_PROVIDER_STATE, (data: EventProviderState) => {
    if (!selectedProvider) return;
    if (selectedProvider === data.provider.id && data.newState === ConnectionState.STATES.CONNECTED) {
      updatePackageList(selectedProvider);
    }
  });

  const createPackageExplorer = useMemo(() => {
    return <PackageExplorer selectedProvider={selectedProvider} packageList={packageList} />;
  }, [selectedProvider, packageList]);

  const getHostStyle = useCallback(
    function getHostStyle(): object {
      if (selectedProvider && settingsCtx.get("colorizeHosts")) {
        const provider = rosCtx.getProviderById(selectedProvider);
        const hColor = colorFromHostname(provider?.name() || "");
        return {
          borderLeftStyle: "solid",
          borderLeftColor: hColor,
          borderLeftWidth: "0.6em",
          borderBottomStyle: "solid",
          borderBottomColor: hColor,
          borderBottomWidth: "0.6em",
        };
      }
      return {};
    },
    [selectedProvider, settingsCtx.changed]
  );

  return (
    <Box
      width="100%"
      height="100%"
      sx={{ backgroundColor: backgroundColor }}
      // paddingLeft="10px"
    >
      <Stack direction="column" height="100%" width="100% ">
        {rosCtx.providers && rosCtx.providers.length > 0 && (
          <Stack spacing={1} direction="row" width="100%" sx={getHostStyle()}>
            <FormControl sx={{ m: 1, width: "100%" }} variant="standard">
              <ProviderSelector
                defaultProvider={selectedProvider}
                setSelectedProvider={(provId) => setSelectedProvider(provId)}
              />
            </FormControl>
            {showReloadButton && (
              <Tooltip
                title="Reload package list"
                placement="bottom"
                enterDelay={tooltipDelay}
                enterNextDelay={tooltipDelay}
              >
                <IconButton
                  size="small"
                  onClick={() => {
                    updatePackageList(selectedProvider, true);
                  }}
                >
                  <RefreshIcon fontSize="inherit" />
                </IconButton>
              </Tooltip>
            )}
          </Stack>
        )}
        {(!rosCtx.providers || rosCtx.providers.length === 0) && (
          <Alert severity="info" style={{ minWidth: 0, marginTop: 10 }}>
            <AlertTitle>No providers available</AlertTitle>
            Please connect to a ROS provider
          </Alert>
        )}
        {selectedProvider && selectedProvider.length > 0 && <Stack overflow="auto">{createPackageExplorer}</Stack>}
      </Stack>
    </Box>
  );
}
