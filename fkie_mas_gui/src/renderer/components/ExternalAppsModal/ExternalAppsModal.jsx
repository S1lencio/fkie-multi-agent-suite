import { useCallback, useContext, useState } from 'react';

import AppsIcon from '@mui/icons-material/Apps';
import {
  Button,
  Dialog,
  DialogActions,
  DialogContent,
  DialogTitle,
  IconButton,
  MenuItem,
  Stack,
  Table,
  TableBody,
  TableCell,
  TableContainer,
  TableHead,
  TableRow,
  Tooltip,
} from '@mui/material';

import PlayArrowIcon from '@mui/icons-material/PlayArrow';
import RemoveOutlinedIcon from '@mui/icons-material/RemoveOutlined';
import { RosContext } from '../../context/RosContext';
import { SSHContext } from '../../context/SSHContext';
import { SettingsContext } from '../../context/SettingsContext';
import { generateUniqueId } from '../../utils';
import DraggablePaper from '../UI/DraggablePaper';

const headers = [
  {
    key: 'application',
    header: 'Application',
  },
  {
    key: 'run',
    header: 'Run',
  },
];

// TODO: Make commands editable and save into configuration config
const applicationRows = [
  {
    id: generateUniqueId(),
    application: 'RVIZ',
    commandROS1: 'rosrun rviz rviz',
    commandROS2: 'ros2 run rviz2 rviz2',
  },
  {
    id: generateUniqueId(),
    application: 'RQT GUI',
    commandROS1: 'rosrun rqt_gui rqt_gui',
    commandROS2: 'ros2 run rqt_gui rqt_gui',
  },
  {
    id: generateUniqueId(),
    application: 'Terminal',
    commandROS1: 'terminator',
    commandROS2: 'terminator',
  },
  {
    id: generateUniqueId(),
    application: 'TF Tree',
    commandROS1: 'rosrun rqt_tf_tree rqt_tf_tree',
    commandROS2: null,
  },
  {
    id: generateUniqueId(),
    application: 'Logger Level',
    commandROS1: 'rosrun rqt_logger_level rqt_logger_level',
    commandROS2: null,
  },
  {
    id: generateUniqueId(),
    application: 'Console',
    commandROS1: 'rosrun rqt_console rqt_console',
    commandROS2: 'ros2 run rqt_console rqt_console',
  },
  {
    id: generateUniqueId(),
    application: 'ROS Graph',
    commandROS1: 'rosrun rqt_graph rqt_graph',
    commandROS2: 'ros2 run rqt_graph rqt_graph',
  },
];

function ExternalAppsModal() {
  const rosCtx = useContext(RosContext);
  const settingsCtx = useContext(SettingsContext);
  const sshCtx = useContext(SSHContext);

  const [open, setOpen] = useState(false);
  const handleOpen = () => setOpen(true);
  const handleClose = (event, reason) => {
    if (reason && reason === 'backdropClick') return;
    setOpen(false);
  };

  const runApp = useCallback(
    async (command) => {
      await sshCtx.exec(null, command);
    },
    [sshCtx],
  );

  return (
    <Stack padding={0}>
      <Dialog
        open={open}
        onClose={handleClose}
        fullWidth
        maxWidth="md"
        PaperComponent={DraggablePaper}
        aria-labelledby="draggable-dialog-title"
      >
        <DialogTitle style={{ cursor: 'move' }} id="draggable-dialog-title">
          External Applications
        </DialogTitle>

        <DialogContent scroll="paper">
          <TableContainer>
            <Table>
              <TableHead>
                <TableRow>
                  {headers.map((header) => (
                    <TableCell key={header.key} sx={{ fontWeight: 'bold' }}>
                      {header.header}
                    </TableCell>
                  ))}
                </TableRow>
              </TableHead>
              <TableBody>
                {applicationRows.map((row) => {
                  let command = null;

                  if (rosCtx.rosInfo) {
                    if (rosCtx.rosInfo.version === '1' && row.commandROS1)
                      command = row.commandROS1;

                    if (rosCtx.rosInfo.version === '2' && row.commandROS2)
                      command = row.commandROS2;
                  }
                  return (
                    <TableRow
                      key={row.id}
                      sx={{ '&:last-child td, &:last-child th': { border: 0 } }}
                    >
                      <TableCell component="th" scope="row">
                        {row.application}
                      </TableCell>
                      <TableCell>
                        {command && (
                          <IconButton
                            size="small"
                            onClick={() => {
                              runApp(command);
                              handleClose();
                            }}
                          >
                            <PlayArrowIcon />
                          </IconButton>
                        )}

                        {!command && (
                          <IconButton size="small">
                            <RemoveOutlinedIcon />
                          </IconButton>
                        )}
                      </TableCell>
                    </TableRow>
                  );
                })}
              </TableBody>
            </Table>
          </TableContainer>
        </DialogContent>
        <DialogActions>
          <Button autoFocus onClick={handleClose}>
            Close
          </Button>
        </DialogActions>
      </Dialog>
      <Tooltip
        title="Apps"
        placement="right"
        enterDelay={settingsCtx.get('tooltipEnterDelay')}
      >
        <MenuItem
          sx={{
            padding: '0.8em',
            color: settingsCtx.get('useDarkMode')
              ? '#fff'
              : 'rgba(0, 0, 0, 0.54)',
          }}
          onClick={handleOpen}
        >
          <AppsIcon sx={{ fontSize: 28 }} />
        </MenuItem>
      </Tooltip>
    </Stack>
  );
}

export default ExternalAppsModal;
