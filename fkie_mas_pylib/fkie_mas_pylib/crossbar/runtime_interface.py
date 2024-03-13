import json
import os
import platform
import psutil
from typing import List, Dict, Union
import re
from fkie_mas_pylib.logging.logging import Log
from fkie_mas_pylib import names

SEP = "/"
if "ROS_VERSION" in os.environ and os.environ["ROS_VERSION"] == "1":
    import rospy

    SEP = rospy.names.SEP


def get_node_name(name):
    """
    :param str name: the complete name of the node.
    :return: The name without namespace.
    :rtype: str
    """
    result = os.path.basename(name).strip(SEP)
    return result


class RosDuration:
    def __init__(self, sec: int = 0, nanosec: int = 0) -> None:
        self.sec = sec
        self.nanosec = nanosec


class RosQos:
    """
    Quality of service settings for a ros topic.
    """

    class RELIABILITY:
        # Implementation specific default
        SYSTEM_DEFAULT = 0
        # Guarantee that samples are delivered, may retry multiple times.
        RELIABLE = 1
        # Attempt to deliver samples, but some may be lost if the network is not robust
        BEST_EFFORT = 2
        # Reliability policy has not yet been set
        UNKNOWN = 3

    # QoS history enumerations describing how samples endure
    class HISTORY:
        # Implementation default for history policy
        SYSTEM_DEFAULT = 0
        # Only store up to a maximum number of samples, dropping oldest once max is exceeded
        KEEP_LAST = 1
        # Store all samples, subject to resource limits
        KEEP_ALL = 2
        # History policy has not yet been set
        UNKNOWN = 3

    # QoS durability enumerations describing how samples persist
    class DURABILITY:
        # Implementation specific default
        SYSTEM_DEFAULT = 0
        # The rmw publisher is responsible for persisting samples for “late-joining” subscribers
        TRANSIENT_LOCAL = 1
        # Samples are not persistent
        VOLATILE = 2
        # Durability policy has not yet been set
        UNKNOWN = 3

    # QoS liveliness enumerations that describe a publisher's reporting policy for its alive status.
    # For a subscriber, these are its requirements for its topic's publishers.
    class LIVELINESS:
        # Implementation specific default
        SYSTEM_DEFAULT = 0
        # The signal that establishes a Topic is alive comes from the ROS rmw layer.
        AUTOMATIC = 1
        # Depricated: Explicitly asserting node liveliness is required in this case.
        MANUAL_BY_NODE = 2
        # The signal that establishes a Topic is alive is at the Topic level. Only publishing a message
        # on the Topic or an explicit signal from the application to assert liveliness on the Topic
        # will mark the Topic as being alive.
        # Using `3` for backwards compatibility.
        MANUAL_BY_TOPIC = 3
        # Durability policy has not yet been set
        UNKNOWN = 4

    """
    Use default QoS settings for publishers and subscriptions
    """

    def __init__(
        self,
        durability: int = DURABILITY.VOLATILE,
        history: int = HISTORY.KEEP_LAST,
        depth: int = 10,
        liveliness: int = LIVELINESS.SYSTEM_DEFAULT,
        reliability: int = RELIABILITY.RELIABLE,
        deadline: RosDuration = RosDuration(),
        lease_duration: RosDuration = RosDuration(),
        lifespan: RosDuration = RosDuration(),
    ) -> None:
        self.durability = durability
        self.history = history
        self.depth = depth
        self.liveliness = liveliness
        self.reliability = reliability
        self.deadline = deadline
        self.lease_duration = lease_duration
        self.lifespan = lifespan


class RosTopic:
    def __init__(self, name: str, msgtype: str) -> None:
        self.name = name
        self.msgtype = msgtype
        self.publisher: List[str] = []
        self.subscriber: List[str] = []
        self.qos = RosQos()

    def __str__(self):
        return json.dumps(dict(self), ensure_ascii=False)


class RosService:
    def __init__(self, name: str, srvtype: str) -> None:
        self.name = name
        self.srvtype = srvtype
        self.masteruri = ""
        self.service_API_URI = ""
        self.provider: List[str] = []
        self.location = "local"

    def __str__(self):
        return json.dumps(dict(self), ensure_ascii=False)


class RosParameter:
    """
    Models a ROS parameter object
    """

    def __init__(
        self, name: str, value: Union[int, float, bool, str, List, Dict], type: str = None
    ) -> None:
        self.name = name
        self.value = value
        self.type = type

        if self.type is None:
            self.type = self.get_type()

    def get_type(self):
        """
        Return object type as string: for instance, from [<class 'int'>]  to "int"
        """
        if self.type is not None:
            return self.type

        # Try to infer type based on value
        return re.findall("'(.*)'", str(type(self.value)))[0]

    def typed_value(self):
        if self.type == 'str':
            return self.value
        elif self.type == 'int':
            return int(self.value)
        elif self.type == 'float':
            return float(self.value)
        elif self.type == 'bool':
            if isinstance(self.value, str):
                return self.value.toLowerCase() in ['true', '1']
            else:
                return self.value
        if self.type is not None:
            print(f"not changed parameter type: {self.type}, value type: {type(self.value)}, value: {self.value}")
        return self.value

    def __str__(self) -> str:
        return f"{self.name}: {self.value} ({self.type})"

    def __repr__(self):
        return f"{self.name}: {self.value} ({self.type})"


class RosNode:
    def __init__(self, id: str, name: str) -> None:
        self.id = id
        self.parent_id = None
        self.name = name
        self.namespace = names.namespace(name, with_sep_suffix=False)
        self.status = "running"
        self.pid = -1
        self.node_API_URI = None
        self.masteruri = None
        self.location = "local"
        self.publishers: List[RosTopic] = []
        self.subscribers: List[RosTopic] = []
        self.services: List[RosService] = []
        self.screens: List[str] = []
        self.parameters: List[RosParameter] = []
        self.system_node = False
        self.enclave = ""

    def __str__(self):
        return json.dumps(dict(self), ensure_ascii=False)


class RosProvider:
    """
    :param str name: the name of the ROS Host
    :param str host: hostname
    :param int port: port of crossbar server
    :param str masteruri: master uri
    :param bool origin: True if the provider represents itself, otherwise it is a discovered provider.
    :param str[] hostnames: All known hostnames for this provides, e.g. IPv4 IPv6 or names.
    """

    def __init__(
        self,
        name: str,
        host: str,
        port: int,
        masteruri: str = "",
        origin: bool = False,
        hostnames: List[str] = None,
    ) -> None:
        # Add ROS and system information
        try:
            self.ros_version = (
                os.environ["ROS_VERSION"] if "ROS_VERSION" in os.environ else ""
            )
            self.ros_distro = (
                os.environ["ROS_DISTRO"] if "ROS_DISTRO" in os.environ else ""
            )
            self.ros_domain_id = (
                os.environ["ROS_DOMAIN_ID"] if "ROS_DOMAIN_ID" in os.environ else ""
            )
        except:
            import traceback

            Log.error(
                f"Error when initializing new provider [{name}]: {traceback.format_exc()}"
            )

        # add distro to name, to prevent collisions when ROS1 and ROS2
        # run simultaneously on the same host
        self.name = f"{name} [{self.ros_distro}]"
        self.host = host
        self.port = port
        self.type = "crossbar-wamp"
        self.masteruri = masteruri
        self.origin = origin
        self.hostnames = hostnames if hostnames is not None else []

    def __str__(self):
        return json.dumps(dict(self), ensure_ascii=False)


class SystemInformation:
    """
    :param str name: the name of the ROS Host
    :param str host: hostname
    :param int port: port of crossbar server
    """

    def getSystemInfo(self):
        systemInfo = {}

        pName = platform.uname().system

        if "darwin" in pName.lower():
            pName = "macOS"

        # System Informationen
        systemInfo["os"] = pName
        systemInfo["osRelease"] = platform.uname().release
        systemInfo["osArch"] = platform.uname().machine
        systemInfo["osPlatform"] = platform.platform(True, True)
        systemInfo["osVersion"] = platform.version()

        # CPU Informationen

        systemInfo["cpu"] = platform.processor()
        try:
            systemInfo["cpuCores"] = psutil.cpu_count(logical=False)
            systemInfo["cpuThreads"] = psutil.cpu_count(logical=True)
        except Exception as err:
            pass

        # RAM Informationen

        try:
            ram = psutil.virtual_memory()
            systemInfo["ram"] = ram.total / 1024**3
            systemInfo["ramUsed"] = (ram.total - ram.available) / 1024**3
            systemInfo["ramAvailable"] = ram.available / 1024**3
            systemInfo["ramPercent"] = ram.percent
        except Exception as err:
            pass

        # Disk Informationen
        try:
            disk = psutil.disk_usage("/")
            systemInfo["disk"] = disk.total / 1024**3
            systemInfo["diskUsed"] = (disk.total - disk.free) / 1024**3
            systemInfo["diskFree"] = disk.free / 1024**3
            systemInfo["diskPercent"] = disk.percent
        except Exception as err:
            pass

        return systemInfo

    def __init__(
        self,
    ) -> None:
        try:
            # self.env = os.environ
            self.system_info = self.getSystemInfo()
        except:
            import traceback

            Log.error(
                f"Error when create system information: {traceback.format_exc()}")
            self.system_info = {}

    def __str__(self):
        return json.dumps(dict(self), ensure_ascii=False)


class SystemEnvironment:
    """
    :param str name: the name of the ROS Host
    :param str host: hostname
    :param int port: port of crossbar server
    """

    def __init__(
        self,
    ) -> None:
        try:
            self.environment = dict(os.environ)
        except:
            import traceback

            Log.error(
                f"Error when create environment information: {traceback.format_exc()}"
            )
            self.environment = {}

    def __str__(self):
        return json.dumps(dict(self), ensure_ascii=False)


class ScreensMapping:
    """
    :param str name: full node name
    :param [str] screens: list the screen names associated with given node.
    """

    def __init__(self, name: str, screens: List[str]) -> None:
        self.name = name
        self.screens = screens

    def __str__(self):
        return json.dumps(dict(self), ensure_ascii=False)


class SystemWarning:
    """
    :param str msg: short warning message.
    :param str details: long description.
    :param str hint: note on the possible solution.
    """

    def __init__(self, msg: str, details: str = "", hint: str = "") -> None:
        self.msg = msg
        self.details = details
        self.hint = hint


class SystemWarningGroup:
    ID_ADDR_MISMATCH = "ADDR_MISMATCH"
    ID_RESOLVE_FAILED = "RESOLVE_FAILED"
    ID_UDP_SEND = "UDP_SEND"
    ID_EXCEPTION = "EXCEPTION"
    ID_TIME_JUMP = "TIME_JUMP"

    """
    :param str id: id of the warning group, on of ID_*.
    :param list[SystemWarning] warnings: list of warnings.
    """

    def __init__(self, id: str, warnings: List[SystemWarning] = None) -> None:
        self.id = id
        self.warnings = [] if warnings is None else warnings

    def append(self, warning: SystemWarning):
        self.warnings.append(warning)

    def __eq__(self, other) -> bool:
        if self.id != other.id:
            return False
        if len(self.warnings) != len(other.warnings):
            return False
        for my_warning in self.warnings:
            found = False
            for other_warning in other.warnings:
                if my_warning.msg == other_warning.msg:
                    found = True
                    break
            if not found:
                return False
        return True


class SubscriberFilter:
    """
    Parametrization of a subscriber to echo a topic.
    :param bool no_data: report only statistics without message content.
    :param bool no_arr: exclude arrays.
    :param bool no_str: exclude string fields.
    :param int hz: rate to forward messages. Ignored on latched topics. Disabled by 0. Default: 1
    :param int window: window size, in # of messages, for calculating rate
    """

    def __init__(
        self,
        no_data: bool = False,
        no_arr: bool = False,
        no_str: bool = False,
        hz: float = 1,
        window: int = 0,
    ) -> None:
        self.no_data = no_data
        self.no_arr = no_arr
        self.no_str = no_str
        self.hz = hz
        self.window = window


class SubscriberNode:
    """
    Parametrization of a subscriber to echo a topic.
    :param str topic: Name of the ROS topic to listen to (e.g. '/chatter').
    :param str message_type: Type of the ROS message (e.g. 'std_msgs/msg/String'). (Only ROS2)
    :param bool tcp_no_delay: use the TCP_NODELAY transport hint when subscribing to topics (Only ROS1)
    :param bool use_sim_time: Enable ROS simulation time (Only ROS2)
    :param SubscriberFilter filter: filter
    """

    def __init__(
        self,
        topic: str,
        message_type: str = "",
        tcp_no_delay: bool = False,
        use_sim_time: bool = False,
        filter: SubscriberFilter = SubscriberFilter(),
        qos: RosQos = RosQos(),
    ) -> None:
        self.topic = topic
        self.message_type = message_type
        self.tcp_no_delay = tcp_no_delay
        self.use_sim_time = use_sim_time
        self.filter = filter
        self.qos = qos


class SubscriberEvent:
    """
    Event message published by SubscriberNode.
    :param str topic: Name of the ROS topic to listen to (e.g. '/chatter').
    :param str message_type: Type of the ROS message (e.g. 'std_msgs/msg/String')
    :param int count: Count of received messages since the start.
    """

    def __init__(
        self,
        topic: str,
        message_type: str = "",
        latched: bool = False,
        data: Dict = {},
        count: int = 0,
        rate: float = -1,
        bw: float = -1,
        bw_min: float = -1,
        bw_max: float = -1,
        delay: float = -1,
        delay_min: float = -1,
        delay_max: float = -1,
        size: float = -1,
        size_min: float = -1,
        size_max: float = -1,
    ) -> None:
        self.topic = topic
        self.message_type = message_type
        self.latched = latched
        self.data = data
        self.count = count
        self.rate = rate
        self.bw = bw
        self.bw_min = bw_min
        self.bw_max = bw_max
        self.delay = delay
        self.delay_min = delay_min
        self.delay_max = delay_max
        self.size = size
        self.size_min = size_min
        self.size_max = size_max


class DaemonVersion:
    """
    Version of the daemon node.
    :param str version: version string.
    :param str date: Date string.
    """

    def __init__(self, version: str, date: str) -> None:
        self.version = version
        self.date = date

    def __repr__(self) -> str:
        return f"DaemonVersion<version: {self.version}, date: {self.date}>"


class DiagnosticArray:
    """
    This message is used to send diagnostic information about the state of the host.
:param timestamp:
:param status: an array of components being reported on.

    """

    def __init__(self, timestamp: float, status: []) -> None:
        self.timestamp = timestamp
        self.status = status


class DiagnosticStatus:
    """
 This message holds the status of an individual component of the host.
  :param level: level of operation enumerated above
  :param name: a description of the test/component reporting
  :param message: a description of the status
  :param hardware_id: a hardware unique string
  :param values: an array of values associated with the status
     """

    # Possible levels of operations
    class LevelType:
        OK = 0
        WARN = 1
        ERROR = 2
        STALE = 3

    class KeyValue:
        def __init__(self, key: str, value: str) -> None:
            self.key = key
            self.value = value

    def __init__(self, level: LevelType, name: str, message: str, hardware_id: str, values: List[KeyValue]) -> None:
        self.level = level
        self.name = name
        self.message = message
        self.hardware_id = hardware_id
        self.values = values


class LoggerConfig:
    """
    Logger configuration for one of the ros node logger.
    :param level: level of logging
    :param name: name of the logger
     """

    # Possible levels of logging
    class LogLevelType:
        DEBUG = "DEBUG"
        INFO = "INFO"
        WARN = "WARN"
        ERROR = "ERROR"
        FATAL = "FATAL"

    def __init__(self, level: LogLevelType, name: str) -> None:
        self.level = level
        self.name = name
