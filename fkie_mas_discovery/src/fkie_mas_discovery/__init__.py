#!/usr/bin/env python
#
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

import os
import signal
import sys

import rospy
import time

try:
    from urlparse import urlparse  # python 2 compatibility
except ImportError:
    from urllib.parse import urlparse

from fkie_mas_pylib.logging.logging import Log


# MCAST_GROUP = "ff02::1"# ipv6 multicast group
MCAST_GROUP = "226.0.0.0"  # ipv4 multicast group
MCAST_PORT = 11511
PROCESS_NAME = "mas_discovery"


def get_default_rtcp_port(zeroconf=False):
    try:
        from fkie_mas_pylib.system.ros1_masteruri import from_ros
        masteruri = from_ros()
        # Log.info(f'ROS Master URI: {masteruri}')
        return urlparse(masteruri).port + (600 if zeroconf else 300)
    except:
        import traceback
        print(traceback.format_exc())
        return 11911 if zeroconf else 11611


def set_terminal_name(name):
    '''
    Change the terminal name.
    @param name: New name of the terminal
    @type name:  str
    '''
    sys.stdout.write("\x1b]2;%s\x07" % name)


def set_process_name(name):
    '''
    Change the process name.
    @param name: New process name
    @type name:  str
    '''
    try:
        from ctypes import cdll, byref, create_string_buffer
        libc = cdll.LoadLibrary('libc.so.6')
        buff = create_string_buffer(len(name) + 1)
        buff.value = name
        libc.prctl(15, byref(buff), 0, 0, 0)
    except Exception:
        try:
            import setproctitle
            setproctitle.setproctitle(name)
        except Exception:
            pass


def is_port_in_use(port):
    import socket
    import errno
    result = False
    s = socket.socket(socket.AF_INET, socket.SOCK_STREAM)
    try:
        s.bind(('localhost', port))
    except socket.error as e:
        if e.errno == errno.EADDRINUSE:
            result = True
        else:
            # something else raised the socket.error exception
            print(e)
    s.close()
    return result


def wait_for_free_port():
    wait_index = 0
    rpc_port = get_default_rtcp_port()
    while wait_index < 12 and is_port_in_use(rpc_port):
        wait_index += 1
        if wait_index == 1:
            print('RPC port %d is already in use, is there another instance of mas_discovery running?' % rpc_port)
        time.sleep(1)
    if wait_index > 1:
        # give time for shutdown other node
        time.sleep(3)


def main():
    '''
    Creates and runs the ROS node using multicast messages for discovering
    '''
    import fkie_mas_discovery.master_discovery as mas_discovery
    wait_for_free_port()
    # setup the loglevel
    try:
        log_level = getattr(rospy, rospy.get_param(
            '/%s/log_level' % PROCESS_NAME, "INFO"))
    except Exception as e:
        print("Error while set the log level: %s\n->INFO level will be used!" % e)
        log_level = rospy.INFO
    rospy.init_node(PROCESS_NAME, log_level=log_level)
    set_terminal_name(PROCESS_NAME)
    set_process_name(PROCESS_NAME)
    mcast_group = rospy.get_param('~mcast_group', MCAST_GROUP)
    mcast_port = rospy.get_param('~mcast_port', MCAST_PORT)
    rpc_port = rospy.get_param('~rpc_port', get_default_rtcp_port())
    rpc_addr = rospy.get_param('~rpc_addr', '')
    try:
        discoverer = mas_discovery.Discoverer(
            mcast_port, mcast_group, rpc_port, rpc_addr=rpc_addr)
        discoverer.start()
        rospy.spin()
        discoverer.finish()
    except Exception as e:
        import traceback
        Log.error(f'Error while starting mas_discovery: {e}',
                  traceback.format_exc())
        os.kill(os.getpid(), signal.SIGKILL)
        time.sleep(10)


def main_zeroconf():
    '''
    Creates and runs the ROS node using zeroconf/avahi for discovering
    '''
    import fkie_mas_discovery.zeroconf as zeroconf
    PROCESS_NAME = "zeroconf"
    wait_for_free_port()
    # setup the loglevel
    try:
        log_level = getattr(rospy, rospy.get_param(
            '/%s/log_level' % PROCESS_NAME, "INFO"))
    except Exception as e:
        print("Error while set the log level: %s\n->INFO level will be used!" % e)
        log_level = rospy.INFO
    rospy.init_node(PROCESS_NAME, log_level=log_level)
    set_terminal_name(rospy.get_name())
    set_process_name(rospy.get_name())
    mcast_port = rospy.get_param('~mcast_port', MCAST_PORT)
    rpc_port = rospy.get_param('~rpc_port', get_default_rtcp_port(True))
    discoverer = zeroconf.Discoverer(rpc_port, mcast_port - MCAST_PORT)
    discoverer.start()
    rospy.spin()
