import { useCallback, useContext, useEffect, useState } from 'react';

import {
  Alert,
  AlertTitle,
  Box,
  Button,
  Chip,
  Paper,
  Stack,
  Table,
  TableBody,
  TableCell,
  TableContainer,
  TableHead,
  TableRow,
  Typography,
} from '@mui/material';

import { grey } from '@mui/material/colors';

import { emitCustomEvent } from 'react-custom-events';
import { CopyButton, Tag, getDiagnosticStyle } from '../../../components';
import { LoggingContext } from '../../../context/LoggingContext';
import { NavigationContext } from '../../../context/NavigationContext';
import { RosContext } from '../../../context/RosContext';
import { SettingsContext } from '../../../context/SettingsContext';
import useLocalStorage from '../../../hooks/useLocalStorage';
import { RosNodeStatus, getDiagnosticLevelName } from '../../../models';

import {
  EVENT_OPEN_COMPONENT,
  eventOpenComponent,
} from '../../../utils/events';
import OverflowMenuService from './OverflowMenuService';
import OverflowMenuTopic from './OverflowMenuTopic';
import ServiceCallerPanel from './ServiceCallerPanel';
import TopicEchoPanel from './TopicEchoPanel';
import TopicPublishPanel from './TopicPublishPanel';
import TopicsPanel from './TopicsPanel';

const compareTopics = (a, b) => {
  if (a.name < b.name) {
    return -1;
  }
  if (a.name > b.name) {
    return 1;
  }
  return 0;
};

function NodesDetailsPanel() {
  const logCtx = useContext(LoggingContext);
  const rosCtx = useContext(RosContext);
  const settingsCtx = useContext(SettingsContext);
  const navCtx = useContext(NavigationContext);

  const [nodesShow, setNodesShow] = useState([]);

  const [showNodeInfo, setShowNodeInfo] = useLocalStorage(
    'NodesDetailsPanel:showNodeInfo',
    false,
  );
  const [showPublishers, setShowPublishers] = useLocalStorage(
    'NodesDetailsPanel:showPublishers',
    true,
  );
  const [showSubscribers, setShowSubscribers] = useLocalStorage(
    'NodesDetailsPanel:showSubscribers',
    true,
  );
  const [showServices, setShowServices] = useLocalStorage(
    'NodesDetailsPanel:showServices',
    false,
  );
  const [showConnections, setShowConnections] = useLocalStorage(
    'NodesDetailsPanel:showConnections',
    true,
  );

  useEffect(() => {
    // TODO: Make a parameter or config for [maxNodes]
    const maxNodes = 3;
    setNodesShow(
      navCtx.selectedNodes.slice(
        0,
        navCtx.selectedNodes.length > maxNodes
          ? maxNodes
          : navCtx.selectedNodes.length,
      ),
    );
  }, [navCtx.selectedNodes]);

  const onTopicClick = useCallback(
    (rosTopicType, topic, providerId) => {
      if (rosTopicType === 'clipboard') {
        if (navigator && navigator.clipboard) {
          navigator.clipboard.writeText(topic);
          logCtx.success('Topic name copied!');
        }
        return;
      }
      if (rosTopicType === 'INFO') {
        emitCustomEvent(
          EVENT_OPEN_COMPONENT,
          eventOpenComponent(
            'topics',
            `Topic Info - ${topic}`,
            <TopicsPanel initialSearchTerm={topic} />,
            true,
            true,
          ),
        );
        return;
      }

      if (rosTopicType === 'PUBLISH') {
        emitCustomEvent(
          EVENT_OPEN_COMPONENT,
          eventOpenComponent(
            'publish-topic',
            `Publish - ${topic}`,
            <TopicPublishPanel topicName={topic} providerId={providerId} />,
            true,
            true,
          ),
        );
        return;
      }

      let tittle = null;
      let defaultNoData = true;
      if (rosTopicType === 'HZ') tittle = 'Rate (Hz)';
      if (rosTopicType === 'BW') tittle = 'Bandwidth';
      if (rosTopicType === 'DELAY') tittle = 'Delay';

      if (rosTopicType === 'ECHO') {
        tittle = 'Echo';
        defaultNoData = false;
      }
      emitCustomEvent(
        EVENT_OPEN_COMPONENT,
        eventOpenComponent(
          'echo-topic',
          `${tittle} - ${topic}`,
          <TopicEchoPanel
            showOptions
            defaultRosTopicType={rosTopicType}
            defaultProvider={providerId}
            defaultTopic={topic}
            defaultNoData={defaultNoData}
          />,
          true,
          true,
        ),
      );
    },
    [logCtx],
  );

  const onServiceClick = useCallback(
    (rosServiceType, service, providerId) => {
      if (rosServiceType === 'clipboard') {
        if (navigator && navigator.clipboard) {
          navigator.clipboard.writeText(service);
          logCtx.success('Service name copied!');
        }
        return;
      }
      if (rosServiceType === 'SERVICE_CALL') {
        emitCustomEvent(
          EVENT_OPEN_COMPONENT,
          eventOpenComponent(
            `call-service`,
            `Call Service - ${service}`,
            <ServiceCallerPanel
              serviceName={service}
              providerId={providerId}
            />,
            true,
            true,
          ),
        );
        return;
      }
      if (rosServiceType === 'INFO') {
        logCtx.warn('Info Service Panel not implemented!');
      }
    },
    [logCtx],
  );

  return (
    <Box
      width="100%"
      height="100%"
      overflow="auto"
      backgroundColor={settingsCtx.get('backgroundColor')}
    >
      {nodesShow.map((node) => {
        return (
          <Stack
            key={`${node.name}_${node.providerId}`}
            // spacing={1}
            alignItems="left"
          >
            <Stack paddingTop={1}>
              <Typography
                variant="h6"
                style={{
                  color: '#fff',
                  backgroundColor: '#2196f3',
                  fontSize: settingsCtx.fontSize,
                }}
                align="center"
              >
                <Box sx={{ fontWeight: 'bold', m: 0.5 }}>
                  {node.name.replace(node.namespace, '').replace('/', '')}
                  <CopyButton value={node.name} />
                </Box>
              </Typography>
              <Typography
                variant="h6"
                style={{ color: grey[700], fontSize: settingsCtx.fontSize }}
                align="center"
              >
                Namespace: {node?.namespace}
              </Typography>
              <Typography
                variant="h6"
                style={{ color: grey[700], fontSize: settingsCtx.fontSize }}
                align="center"
              >
                <Box sx={{ fontWeight: 'bold', m: 1 }}>{node.providerName}</Box>
              </Typography>
            </Stack>

            {node && node.diagnosticLevel > 0 && (
              <Typography
                variant="body1"
                style={getDiagnosticStyle(node.diagnosticLevel)}
                marginBottom={1}
              >
                {getDiagnosticLevelName(node.diagnosticLevel)}:{' '}
                {node.diagnosticMessage}
              </Typography>
            )}

            {showNodeInfo && (
              <Stack spacing={0.5}>
                <Stack direction="row" spacing={0.5}>
                  <Tag
                    color={
                      node.status === RosNodeStatus.RUNNING
                        ? 'success'
                        : 'default'
                    }
                    title="Status:"
                    // title={`${RosNodeStatusInfo[node.status]}`}
                    text={node.status}
                    wrap
                  />

                  {node.pid && Math.round(node.pid) > 0 && (
                    <Tag color="info" title="PID:" text={`${node.pid}`} wrap />
                  )}

                  {node.node_API_URI && node.node_API_URI.length > 0 && (
                    <Tag
                      color="default"
                      title="URI:"
                      text={node.node_API_URI}
                      wrap
                    />
                  )}
                </Stack>

                <Stack direction="row" spacing={0.5}>
                  {node.masteruri && node.masteruri.length > 0 && (
                    <Tag
                      color="primary"
                      title="MASTERURI:"
                      text={node.masteruri}
                      wrap
                    />
                  )}
                </Stack>

                {node.launchPaths &&
                  [...node.launchPaths].map((launchPath) => (
                    <Tag
                      key={launchPath}
                      color="info"
                      title="Launch:"
                      text={launchPath}
                      wrap
                    />
                  ))}
              </Stack>
            )}

            {node && (
              <Stack spacing={1}>
                {showPublishers && (
                  <>
                    <Typography variant="caption">
                      <Box sx={{ fontWeight: 'bold', marginTop: 1 }}>
                        Published topics:
                        {` [${node.publishers.size}]`}
                      </Box>
                    </Typography>
                    {node.publishers.size > 0 && (
                      // useZebraStyles={false}>
                      <TableContainer component={Paper}>
                        <Table size="small" aria-label="a dense table">
                          <TableHead style={{ fontSize: settingsCtx.fontSize }}>
                            <TableRow>
                              <TableCell sx={{ fontWeight: 'bold' }}>
                                <Stack direction="row" spacing={0} padding={0}>
                                  {showConnections && (
                                    <Chip
                                      size="small"
                                      title="pub"
                                      color="default"
                                      label="pub"
                                      sx={{ fontSize: settingsCtx.fontSize }}
                                    />
                                  )}
                                  {showConnections && (
                                    <Chip
                                      size="small"
                                      title="sub"
                                      color="default"
                                      label="sub"
                                      sx={{ fontSize: settingsCtx.fontSize }}
                                    />
                                  )}
                                  <Typography
                                    sx={{
                                      fontSize: settingsCtx.fontSize,
                                      marginLeft: 1,
                                      marginTop: 0.5,
                                      fontWeight: 'bold',
                                    }}
                                  >
                                    Topic Name
                                  </Typography>
                                </Stack>
                              </TableCell>
                            </TableRow>
                          </TableHead>
                          <TableBody style={{ fontSize: settingsCtx.fontSize }}>
                            {Array.from(node.publishers.values())
                              .sort(compareTopics)
                              .map((topic) => (
                                <TableRow key={topic.name}>
                                  <TableCell style={{ padding: 0 }}>
                                    <Stack direction="row" spacing={0}>
                                      <OverflowMenuTopic
                                        onClick={onTopicClick}
                                        topicName={topic.name}
                                        providerId={node.providerId}
                                      />

                                      {showConnections && (
                                        <Stack
                                          direction="row"
                                          spacing={0}
                                          padding={0}
                                        >
                                          <Chip
                                            size="small"
                                            title="publishers"
                                            // showZero={true}
                                            color={(() => {
                                              if (topic.publisher.length === 0)
                                                return 'warning';
                                              if (topic.publisher.length === 1)
                                                return 'default';
                                              return 'info';
                                            })()}
                                            label={topic.publisher.length}
                                          />

                                          <Chip
                                            size="small"
                                            title="subscribers"
                                            // showZero={true}
                                            color={
                                              topic.subscriber.length > 0
                                                ? 'default'
                                                : 'warning'
                                            }
                                            label={topic.subscriber.length}
                                          />
                                        </Stack>
                                      )}
                                      <Button
                                        size="small"
                                        sx={{ marginLeft: 1 }}
                                        style={{
                                          padding: 0,
                                          textTransform: 'none',
                                          justifyContent: 'left',
                                        }}
                                        onClick={() =>
                                          onTopicClick(
                                            'INFO',
                                            topic.name,
                                            node.providerId,
                                          )
                                        }
                                      >
                                        {`${topic.name}`}
                                      </Button>
                                    </Stack>
                                  </TableCell>
                                </TableRow>
                              ))}
                          </TableBody>
                        </Table>
                      </TableContainer>
                    )}
                  </>
                )}

                {showSubscribers && (
                  <>
                    <Typography variant="caption">
                      <Box sx={{ fontWeight: 'bold', marginTop: 1 }}>
                        Subscribed Topics:
                        {` [${node.subscribers.size}]`}
                      </Box>
                    </Typography>
                    {node.subscribers.size > 0 && (
                      <TableContainer component={Paper}>
                        <Table size="small" aria-label="a dense table">
                          <TableHead style={{ fontSize: settingsCtx.fontSize }}>
                            <TableRow>
                              <TableCell sx={{ fontWeight: 'bold' }}>
                                <Stack direction="row" spacing={0} padding={0}>
                                  {showConnections && (
                                    <Chip
                                      size="small"
                                      title="pub"
                                      color="default"
                                      label="pub"
                                      sx={{ fontSize: settingsCtx.fontSize }}
                                    />
                                  )}
                                  {showConnections && (
                                    <Chip
                                      size="small"
                                      title="sub"
                                      color="default"
                                      label="sub"
                                      sx={{ fontSize: settingsCtx.fontSize }}
                                    />
                                  )}
                                  <Typography
                                    sx={{
                                      fontSize: settingsCtx.fontSize,
                                      marginLeft: 1,
                                      marginTop: 0.5,
                                      fontWeight: 'bold',
                                    }}
                                  >
                                    Topic Name
                                  </Typography>
                                </Stack>
                              </TableCell>
                            </TableRow>
                          </TableHead>
                          <TableBody style={{ fontSize: settingsCtx.fontSize }}>
                            {Array.from(node.subscribers.values())
                              .sort(compareTopics)
                              .map((topic) => (
                                <TableRow key={topic.name}>
                                  <TableCell style={{ padding: 0 }}>
                                    <Stack direction="row" spacing={1}>
                                      <OverflowMenuTopic
                                        onClick={onTopicClick}
                                        topicName={topic.name}
                                        providerId={node.providerId}
                                      />

                                      {showConnections && (
                                        <Stack
                                          direction="row"
                                          spacing={0}
                                          padding={0}
                                        >
                                          <Chip
                                            size="small"
                                            title="publishers"
                                            // showZero={true}
                                            color={(() => {
                                              if (topic.publisher.length === 0)
                                                return 'warning';
                                              if (topic.publisher.length === 1)
                                                return 'default';
                                              return 'info';
                                            })()}
                                            label={topic.publisher.length}
                                          />

                                          <Chip
                                            size="small"
                                            title="subscribers"
                                            // showZero={true}
                                            color={
                                              topic.subscriber.length > 0
                                                ? 'default'
                                                : 'warning'
                                            }
                                            label={topic.subscriber.length}
                                          />
                                        </Stack>
                                      )}

                                      <Button
                                        size="small"
                                        style={{
                                          padding: 0,
                                          textTransform: 'none',
                                          justifyContent: 'left',
                                        }}
                                        onClick={() =>
                                          onTopicClick(
                                            'INFO',
                                            topic.name,
                                            node.providerId,
                                          )
                                        }
                                      >
                                        {`${topic.name}`}
                                      </Button>
                                    </Stack>
                                  </TableCell>
                                </TableRow>
                              ))}
                          </TableBody>
                        </Table>
                      </TableContainer>
                    )}
                  </>
                )}

                {showServices && (
                  <>
                    <Typography variant="caption">
                      <Box sx={{ fontWeight: 'bold', marginTop: 1 }}>
                        Available Services:
                        {` [${Array.from(node.services.values()).length}]`}
                      </Box>
                    </Typography>

                    {Array.from(node.services.values()).length > 0 && (
                      <TableContainer component={Paper}>
                        <Table size="small" aria-label="a dense table">
                          <TableBody style={{ fontSize: settingsCtx.fontSize }}>
                            {Array.from(node.services.values()).map(
                              (service) => (
                                <TableRow key={service.name}>
                                  <TableCell style={{ padding: 0 }}>
                                    <Stack direction="row" spacing={1}>
                                      <OverflowMenuService
                                        onClick={onServiceClick}
                                        serviceName={service.name}
                                        providerId={node.providerId}
                                      />

                                      <Button
                                        size="small"
                                        style={{
                                          padding: 0,
                                          textTransform: 'none',
                                          justifyContent: 'left',
                                        }}
                                        onClick={() =>
                                          onServiceClick(
                                            'SERVICE_CALL',
                                            service.name,
                                            node.providerNId,
                                          )
                                        }
                                      >
                                        {`${service.name}`}
                                      </Button>
                                    </Stack>
                                  </TableCell>
                                </TableRow>
                              ),
                            )}
                          </TableBody>
                        </Table>
                      </TableContainer>
                    )}
                  </>
                )}
              </Stack>
            )}
          </Stack>
        );
      })}

      {navCtx.selectedNodes && navCtx.selectedNodes.length === 0 && (
        <Alert severity="info" style={{ minWidth: 0 }}>
          <AlertTitle>Please select a node</AlertTitle>
        </Alert>
      )}
    </Box>
  );
}

NodesDetailsPanel.defaultProps = {};

NodesDetailsPanel.propTypes = {};

export default NodesDetailsPanel;
