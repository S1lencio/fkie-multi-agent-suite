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
import unittest

import fkie_mas_pylib.system.screen as screen
from fkie_mas_pylib.system.screen import SCREEN_SLASH_SEP

PKG = 'fkie_mas_pylib'
TEST_NODE_NAME = f'{SCREEN_SLASH_SEP}test{SCREEN_SLASH_SEP}node'


class TestScreen(unittest.TestCase):
    '''
    '''

    def setUp(self):
        pass

    def tearDown(self):
        pass

    def test_create_session_name(self):
        name = screen.create_session_name(None)
        self.assertEqual(
            name, '', f"wrong screen session name from `None`, got: {name}, expected: ''")
        name = screen.create_session_name('/test/node')
        self.assertEqual(
            name, TEST_NODE_NAME, f"wrong screen session name from `/test/node`, got: {name}, expected: {TEST_NODE_NAME}")

    def test_session_name2node_name(self):
        sname = screen.create_session_name('/test/node')
        nname = screen.session_name2node_name(sname)
        self.assertEqual(
            nname, '/test/node', "wrong node name from session name, got: %s, expected: %s" % (nname, '/test/node'))

    def test_split_session_name(self):
        _pid, name = screen.split_session_name(None)
        self.assertEqual(
            name, '', f"wrong screen session name after split from `None`, got: {name}, expected: ''")
        _pid, name = screen.split_session_name(f'123.{TEST_NODE_NAME}')
        self.assertEqual(
            name, TEST_NODE_NAME, f"wrong screen session name after split from `123.{TEST_NODE_NAME}`, got: {name}, expected: {TEST_NODE_NAME}")
        pid, _name = screen.split_session_name(f'was.{TEST_NODE_NAME}')
        self.assertEqual(
            pid, -1, f"wrong pid after screen split session `was.{TEST_NODE_NAME}`, got: {pid}, expected: -1")
        _pid, name = screen.split_session_name('666. ')
        self.assertEqual(
            name, '', f"wrong name after screen split session `666.`, got: {name}, expected: ''")

    def test_get_logfile(self):
        nodename = '/mas_discovery'
        logfile = screen.get_logfile(node=nodename, for_new_screen=True)
        logpath = f"{os.path.join(screen.LOG_PATH, nodename.replace('_', '__').replace('/', '_'))}.log"
        self.assertEqual(
            logfile, logpath, f"wrong logfile path for node `{nodename}`, got: {logfile}, expected: {logpath}")

        session_name = screen.create_session_name(nodename)
        logfile = screen.get_logfile(session=session_name, for_new_screen=True)
        self.assertEqual(
            logfile, logpath, f"wrong logfile path for session `{session_name}`, got: {logfile}, expected: {logpath}")

    def test_get_ros_logfile(self):
        nodename = '/mas_discovery'
        logfile = screen.get_ros_logfile(nodename, for_new_screen=True)
        logpath = f"{os.path.join(screen.LOG_PATH, nodename.strip('/'))}.log"
        self.assertEqual(
            logfile, logpath, f"wrong ros logfile path for node `{nodename}`, got: {logfile}, expected: {logpath}")

    def test_rosclean(self):
        screen.ros_clean()


if __name__ == '__main__':
    import rosunit
    rosunit.unitrun(PKG, os.path.basename(__file__), TestScreen)
