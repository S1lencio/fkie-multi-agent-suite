// list of supported Crossbar URIs
const URI = {
  ROS_DAEMON_READY: 'ros.daemon.ready',
  ROS_DISCOVERY_READY: 'ros.discovery.ready',
  ROS_DAEMON_VERSION: 'ros.daemon.get_version',
  ROS_FILE_GET: 'ros.file.get',
  ROS_FILE_SAVE: 'ros.file.save',
  ROS_NODES_GET_LIST: 'ros.nodes.get_list',
  ROS_NODES_CHANGED: 'ros.nodes.changed',
  ROS_PROVIDER_LIST: 'ros.provider.list',
  ROS_PROVIDER_GET_LIST: 'ros.provider.get_list',
  ROS_PROVIDER_GET_TIMESTAMP: 'ros.provider.get_timestamp',
  ROS_PROVIDER_GET_SYSTEM_ENV: 'ros.provider.get_system_env',
  ROS_PROVIDER_GET_SYSTEM_INFO: 'ros.provider.get_system_info',
  ROS_PROVIDER_WARNINGS: 'ros.provider.warnings',
  ROS_PROVIDER_GET_DIAGNOSTICS: 'ros.provider.get_diagnostics',
  ROS_PROVIDER_DIAGNOSTICS: 'ros.provider.diagnostics',
  ROS_PROVIDER_ROS_CLEAN_PURGE: 'ros.provider.ros_clean_purge',
  ROS_PACKAGES_GET_LIST: 'ros.packages.get_list',
  // ROS_PATH_GET_LIST: 'ros.path.get_list',
  ROS_PATH_GET_LIST_RECURSIVE: 'ros.path.get_list_recursive',
  ROS_PATH_GET_LOG_PATHS: 'ros.path.get_log_paths',
  ROS_PATH_CLEAR_LOG_PATHS: 'ros.path.clear_log_paths',
  ROS_PATH_CHANGED: 'ros.path.changed',
  ROS_LAUNCH_CALL_SERVICE: 'ros.launch.call_service',
  ROS_LAUNCH_LOAD: 'ros.launch.load',
  ROS_LAUNCH_RELOAD: 'ros.launch.reload',
  ROS_LAUNCH_UNLOAD: 'ros.launch.unload',
  ROS_LAUNCH_GET_LIST: 'ros.launch.get_list',
  ROS_LAUNCH_START_NODE: 'ros.launch.start_node',
  ROS_LAUNCH_CHANGED: 'ros.launch.changed',
  ROS_LAUNCH_GET_INCLUDED_FILES: 'ros.launch.get_included_files',
  // ROS_LAUNCH_INTERPRET_PATH: 'ros.launch.interpret_path',
  ROS_LAUNCH_GET_MSG_STRUCT: 'ros.launch.get_msg_struct',
  ROS_LAUNCH_GET_SRV_STRUCT: 'ros.launch.get_srv_struct',
  ROS_LAUNCH_PUBLISH_MESSAGE: 'ros.launch.publish_message',
  ROS_NODES_STOP_NODE: 'ros.nodes.stop_node',
  ROS_NODES_UNREGISTER: 'ros.nodes.unregister',
  ROS_SCREEN_KILL_NODE: 'ros.screen.kill_node',
  ROS_SCREEN_GET_LIST: 'ros.screen.get_list',
  ROS_SCREEN_LIST: 'ros.screen.list',
  ROS_PARAMETERS_GET_LIST: 'ros.parameters.get_list',
  ROS_PARAMETERS_GET_NODE_PARAMETERS: 'ros.parameters.get_node_parameters',
  ROS_PARAMETERS_HAS_PARAMETER: 'ros.parameters.has_parameter',
  ROS_PARAMETERS_SET_PARAMETER: 'ros.parameters.set_parameter',
  ROS_PARAMETERS_DELETE_PARAMETERS: 'ros.parameters.delete_parameters',
  ROS_SUBSCRIBER_START: 'ros.subscriber.start',
  ROS_SUBSCRIBER_STOP: 'ros.subscriber.stop',
  ROS_SUBSCRIBER_EVENT_PREFIX: 'ros.subscriber.event',
  ROS_SUBSCRIBER_FILTER_PREFIX: 'ros.subscriber.filter',
  ROS_SYSTEM_GET_URI: 'ros.system.get_uri',
};

// eslint-disable-next-line import/prefer-default-export
export default URI;
