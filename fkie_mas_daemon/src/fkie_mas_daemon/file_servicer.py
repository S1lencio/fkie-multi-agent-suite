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

from io import FileIO
import os
import shutil
import re

import json
import asyncio
from autobahn import wamp
from types import SimpleNamespace

from . import file_item
from fkie_mas_pylib import ros_pkg
from fkie_mas_pylib import settings
from fkie_mas_pylib.crossbar.base_session import CrossbarBaseSession
from fkie_mas_pylib.crossbar.base_session import SelfEncoder
from fkie_mas_pylib.crossbar.file_interface import FileItem
from fkie_mas_pylib.crossbar.file_interface import RosPackage
from fkie_mas_pylib.crossbar.file_interface import PathItem
from fkie_mas_pylib.crossbar.file_interface import LogPathItem
from fkie_mas_pylib.crossbar.file_interface import LogPathClearResult
from fkie_mas_pylib.defines import PACKAGE_FILE
from fkie_mas_pylib.launch import xml
from fkie_mas_pylib.logging.logging import Log
from fkie_mas_pylib.system.screen import get_logfile
from fkie_mas_pylib.system.screen import get_ros_logfile
from fkie_mas_daemon.strings import utf8

from typing import List

MANIFEST_FILE = "manifest.xml"


class FileServicer(CrossbarBaseSession):
    FILE_CHUNK_SIZE = 1024

    def __init__(
        self,
        loop: asyncio.AbstractEventLoop,
        realm: str = "ros",
        port: int = 11911,
        test_env=False,
    ):
        Log.info("Create file manger servicer")
        CrossbarBaseSession.__init__(self, loop, realm, port, test_env=test_env)
        self.DIR_CACHE = {}
        self.CB_DIR_CACHE = {}
        self._peers = {}

    #     def _terminated(self):
    #         Log.info("terminated context")
    #
    #     def _register_callback(self, context):
    #         if (context.peer() not in self._peers):
    #             Log.info("Add callback to peer context @%s" % context.peer())
    #             if context.add_callback(self._terminated):
    #                 pass
    #                 # self._peers[context.peer()] = context

    @wamp.register("ros.file.get")
    def getFileContent(self, requestPath: str) -> FileItem:
        Log.info("Request to [ros.file.get] for %s" % requestPath)
        with FileIO(requestPath, "r") as outfile:
            mTime = os.path.getmtime(requestPath)
            fSize = os.path.getsize(requestPath)
            content = outfile.readall()
            encoding = "utf-8"
            try:
                content = content.decode(encoding)
            except:
                content = content.hex()
                encoding = "hex"
            return json.dumps(
                FileItem(requestPath, mTime, fSize, content, encoding), cls=SelfEncoder
            )

    @wamp.register("ros.file.save")
    def saveFileContent(self, request_json: FileItem) -> int:
        # Covert input dictionary into a proper python object
        file = json.loads(
            json.dumps(request_json), object_hook=lambda d: SimpleNamespace(**d)
        )
        Log.info("Request to [ros.file.save] for %s" % file.path)
        with FileIO(file.path, "w+") as outfile:
            content = file.value
            if file.encoding == "utf-8":
                content = content.encode("utf-8")
            elif file.encoding == "hex":
                content = bytes.fromhex(content)
            else:
                raise TypeError(f"unknown encoding {file.encoding}")
            bytesWritten = outfile.write(content)
            return json.dumps(bytesWritten, cls=SelfEncoder)

    @wamp.register("ros.path.get_list")
    def getPathList(self, inputPath: str) -> List[PathItem]:
        Log.info("Request to [ros.path.get_list] for %s" % inputPath)
        path_list: List[PathItem] = []
        # list the path
        dirlist = os.listdir(inputPath)
        for cfile in dirlist:
            path = os.path.normpath("%s%s%s" % (inputPath, os.path.sep, cfile))
            if os.path.isfile(path):
                path_list.append(
                    PathItem(
                        path=path,
                        mtime=os.path.getmtime(path),
                        size=os.path.getsize(path),
                        path_type="file",
                    )
                )
            elif path in self.CB_DIR_CACHE:
                path_list.append(
                    PathItem(
                        path=path,
                        mtime=os.path.getmtime(path),
                        size=os.path.getsize(path),
                        path_type=self.CB_DIR_CACHE[path],
                    )
                )
            elif os.path.isdir(path):
                try:
                    fileList = os.listdir(path)
                    file_type = None
                    if ros_pkg.is_package(fileList):
                        file_type = "package"
                    else:
                        file_type = "dir"
                    self.CB_DIR_CACHE[path] = file_type
                    path_list.append(
                        PathItem(
                            path=path,
                            mtime=os.path.getmtime(path),
                            size=os.path.getsize(path),
                            path_type=file_type,
                        )
                    )
                except Exception as _:
                    pass
        return json.dumps(path_list, cls=SelfEncoder)

    def _glob(
        self,
        inputPath: str,
        recursive: bool = True,
        withHidden: bool = False,
        filter: List[str] = [],
    ) -> List[PathItem]:
        path_list: List[PathItem] = []
        dir_list: List[str] = []
        for name in os.listdir(inputPath):
            if not withHidden and name.startswith("."):
                continue
            filename = os.path.join(inputPath, name)
            if os.path.isfile(filename):
                path_list.append(
                    PathItem(
                        path=filename,
                        mtime=os.path.getmtime(filename),
                        size=os.path.getsize(filename),
                        path_type="file",
                    )
                )
            elif os.path.isdir(filename) and recursive:
                if name not in filter:
                    dir_list.append(filename)
        # glob the directories at the end
        for filename in dir_list:
            path_list.extend(
                self._glob(
                    inputPath=filename,
                    recursive=recursive,
                    withHidden=withHidden,
                    filter=filter,
                )
            )
        return path_list

    @wamp.register("ros.path.get_list_recursive")
    def getPathListRecursive(
        self, inputPath: str, filter=["node_modules"]
    ) -> List[PathItem]:
        Log.info("Request to [ros.path.get_list_recursive] for %s" % inputPath)
        path_list: List[PathItem] = self._glob(
            inputPath, recursive=True, withHidden=False, filter=["node_modules"]
        )
        return json.dumps(path_list, cls=SelfEncoder)

    @wamp.register("ros.packages.get_list")
    def getPackageList(self, clear_cache: bool = False) -> List[RosPackage]:
        Log.info("Request to [ros.packages.get_list]")
        clear_cache = False
        try:
            if clear_cache:
                try:
                    from roslaunch import substitution_args
                    import rospkg

                    substitution_args._rospack = rospkg.RosPack()
                except Exception as err:
                    Log.warn("Cannot reset package cache: %s" % utf8(err))
            package_list: List[RosPackage] = []
            # fill the input fields
            root_paths = [
                os.path.normpath(p) for p in os.getenv("ROS_PACKAGE_PATH").split(":")
            ]
            packages = []
            for p in root_paths:
                ret = ros_pkg.get_packages(p)
                for name, path in ret.items():
                    if name not in packages:
                        package = RosPackage(name=name, path=path)
                        package_list.append(package)
                        packages.append(name)
            return json.dumps(package_list, cls=SelfEncoder)
        except Exception:
            import traceback
            raise Exception(traceback.format_exc())

    @wamp.register("ros.path.get_log_paths")
    def getLogPaths(self, nodes: List[str]) -> List[LogPathItem]:
        Log.info("Request to [ros.path.get_log_paths] for %s" % nodes)
        result = []
        for node in nodes:
            namespace = None
            node_name = node

            namespace_search = re.search("/(.*)/", node_name)
            if namespace_search is not None:
                namespace = f"/{namespace_search.group(1)}"
                node_name = node.replace(f"/{namespace}/", "")

            screen_log = get_logfile(
                node=node_name, for_new_screen=True, namespace=namespace
            )
            ros_log = get_ros_logfile(node)
            log_path_item = LogPathItem(
                node,
                screen_log=screen_log,
                screen_log_exists=os.path.exists(screen_log),
                ros_log=ros_log,
                ros_log_exists=os.path.exists(ros_log),
            )
            result.append(log_path_item)
        return json.dumps(result, cls=SelfEncoder)

    @wamp.register("ros.path.clear_log_paths")
    def clearLogPaths(self, nodes: List[str]) -> List[LogPathClearResult]:
        Log.info(
            f"{self.__class__.__name__}: Request to [ros.path.clear_log_paths] for {nodes}"
        )
        result = []
        for node in nodes:
            namespace = None
            node_name = node

            namespace_search = re.search("/(.*)/", node_name)
            if namespace_search is not None:
                namespace = f"/{namespace_search.group(1)}"
                node_name = node.replace(f"/{namespace}/", "")

            screen_log = get_logfile(
                node=node_name, for_new_screen=True, namespace=namespace
            )
            ros_log = get_ros_logfile(node)
            resultDelete = True
            message = ''
            if (os.path.exists(screen_log)):
                try:
                    os.remove(screen_log)
                except OSError as error:
                    resultDelete = False
                    message += f"Can not remove {screen_log}: {error}. "
            if (os.path.exists(ros_log)):
                try:
                    os.remove(ros_log)
                except OSError as error:
                    resultDelete = False
                    message += f"Can not remove {ros_log}: {error}. "
            log_path_item = LogPathClearResult(
                node,
                result=resultDelete,
                message=message
            )
            result.append(log_path_item)
        return json.dumps(result, cls=SelfEncoder)
