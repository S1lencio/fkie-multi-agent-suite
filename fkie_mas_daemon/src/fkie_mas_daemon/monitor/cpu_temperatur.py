# The MIT License (MIT)

# Copyright (c) 2014-2024 Fraunhofer FKIE, Alexander Tiderko

# Permission is hereby granted, free of charge, to any person obtaining a copy
# of this software and associated documentation files (the "Software"), to deal
# in the Software without restriction, including without limitation the rights
# to use, copy, modify, merge, publish, distribute, sublicense, and/or sell
# copies of the Software, and to permit persons to whom the Software is
# furnished to do so, subject to the following conditions:

# The above copyright notice and this permission notice shall be included in all
# copies or substantial portions of the Software.

# THE SOFTWARE IS PROVIDED "AS IS", WITHOUT WARRANTY OF ANY KIND, EXPRESS OR
# IMPLIED, INCLUDING BUT NOT LIMITED TO THE WARRANTIES OF MERCHANTABILITY,
# FITNESS FOR A PARTICULAR PURPOSE AND NONINFRINGEMENT. IN NO EVENT SHALL THE
# AUTHORS OR COPYRIGHT HOLDERS BE LIABLE FOR ANY CLAIM, DAMAGES OR OTHER
# LIABILITY, WHETHER IN AN ACTION OF CONTRACT, TORT OR OTHERWISE, ARISING FROM,
# OUT OF OR IN CONNECTION WITH THE SOFTWARE OR THE USE OR OTHER DEALINGS IN THE
# SOFTWARE.

import psutil
import time

from diagnostic_msgs.msg import DiagnosticStatus, KeyValue
from fkie_mas_daemon.strings import utf8
from .sensor_interface import SensorInterface
from fkie_mas_pylib.logging.logging import Log


class CpuTemperatur(SensorInterface):

    def __init__(self, hostname='', interval=5.0, warn_level=85.0):
        # self._cpu_temp_warn = rospy.get_param('~cpu_temp_warn', warn_level)
        self._cpu_temp_warn = warn_level
        SensorInterface.__init__(
            self, hostname, sensorname='CPU Temperature', interval=interval)

    def reload_parameter(self, settings):
        pass

    def check_sensor(self):
        try:
            sensor_temps = psutil.sensors_temperatures()
            diag_level = 0
            diag_vals = []
            diag_msg = 'warn at >%.2f&deg;C' % (self._cpu_temp_warn)
            warn_level = self._cpu_temp_warn
            if diag_level == DiagnosticStatus.WARN:
                warn_level = warn_level * 0.9
            max_temp = 0
            for sensor, shwtemps in sensor_temps.items():
                if sensor == 'coretemp':
                    for _label, current, hight, _critical in shwtemps:
                        if hight is not None:
                            self._cpu_temp_warn = hight
                        if current > max_temp:
                            max_temp = current
            if max_temp > warn_level:
                diag_msg = 'CPU Temperature: %.2f degree (warn level >%.2f)' % (
                    max_temp, self._cpu_temp_warn)
            diag_vals.append(KeyValue(key='Max [degree]', value=max_temp))
            # Update status
            with self.mutex:
                self._ts_last = time.time()
                self._stat_msg.level = diag_level
                self._stat_msg.values = diag_vals
                self._stat_msg.message = diag_msg
        except Exception as error:
            import traceback
            print(traceback.format_exc())
            Log.warn(
                "Sensor temperatures are not checked because of error: %s" % utf8(error))
            self._interval = 0
