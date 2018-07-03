import { Platform } from "@batch-flask/utils";
import { expect } from "chai";
import * as cp from "child_process";
import * as process from "process";
import * as sinon from "sinon";
import { TerminalService } from "./terminal.service";

describe("TerminalService", () => {
    let terminalService: TerminalService;
    let osServiceSpy;
    let fsServiceSpy;
    let spawnTmp;
    let spawnSpy: sinon.SinonSpy;
    let platform: Platform;
    let isDebian;
    let ipcMainSpy;
    const envTemp = process.env;

    beforeEach(() => {
        spawnSpy = sinon.fake((exe, args) => {
            return {
                pid: 1234,
                once: () => null,
            };
        });
        spawnTmp = cp.spawn;
        (cp as any).spawn = spawnSpy;
        osServiceSpy = {
            platform: "",
            isWindows: () => platform === Platform.Windows,
            isLinux: () => platform === Platform.Linux,
            isOSX: () => platform === Platform.OSX,
        };
        fsServiceSpy = {
            exists: sinon.fake((filename) => {
                if (filename === "/etc/debian_version") {
                    return isDebian;
                } else {
                    return false;
                }
            }),
        };

        ipcMainSpy = {
            on: () => null,
        };
        terminalService = new TerminalService(osServiceSpy, fsServiceSpy, ipcMainSpy);
    });

    afterEach(() => {
        (cp as any).spawn = spawnTmp;
    });

    describe("when os is windows", () => {
        beforeEach(() => {
            platform = Platform.Windows;
        });

        it("should default to using powershell and launch in a new process", async () => {
            const pid = await terminalService.runInTerminal("echo hello");
            expect(typeof pid).to.eq("number");
            expect(pid).to.eq(1234);
            expect(spawnSpy).to.have.been.calledOnce;
            const spawnArgs = spawnSpy.lastCall.args;
            expect(spawnArgs.length).to.eq(3);
            expect(spawnArgs[0]).to.eq("cmd.exe");
            expect(spawnArgs[1]).to.eql(["/c", "start", "powershell", "-NoExit", "-Command", "echo hello"]);
        });

        it("should launch powershell in a new node process", async () => {
            const pid = await terminalService.runInTerminal("echo hello", "powershell");
            expect(typeof pid).to.eq("number");
            expect(pid).to.eq(1234);
            expect(spawnSpy).to.have.been.calledOnce;
            const spawnArgs = spawnSpy.lastCall.args;
            expect(spawnArgs.length).to.eq(3);
            expect(spawnArgs[0]).to.eq("cmd.exe");
            expect(spawnArgs[1]).to.eql(["/c", "start", "powershell", "-NoExit", "-Command", "echo hello"]);
        });

        it("should launch cmd in a new node process", async () => {
            const pid = await terminalService.runInTerminal("echo hello", "cmd");
            expect(typeof pid).to.eq("number");
            expect(pid).to.eq(1234);
            expect(spawnSpy).to.have.been.calledOnce;
            const spawnArgs = spawnSpy.lastCall.args;
            expect(spawnArgs.length).to.eq(3);
            expect(spawnArgs[0]).to.eq("cmd.exe");
            expect(spawnArgs[1]).to.eql(["/c", "start", "cmd", "/k", "echo hello"]);
        });
    });

    describe("when os is linux", () => {
        beforeEach(() => {
            platform = Platform.Linux;
            isDebian = false;
        });

        afterEach(() => {
            // revert the process.env variables to ensure all tests start with same variables
            delete process.env.DESKTOP_SESSION;
            delete process.env.COLORTERM;
            delete process.env.TERM;
            Object.assign(process.env, envTemp);
        });

        it("should default to using x-terminal-emulator for debian and launch", async () => {
            isDebian = true;
            const pid = await terminalService.runInTerminal("echo hello");
            expect(typeof pid).to.eq("number");
            expect(pid).to.eq(1234);
            expect(spawnSpy).to.have.been.calledOnce;
            const spawnArgs = spawnSpy.lastCall.args;
            expect(spawnArgs.length).to.eq(3);
            expect(spawnArgs[0]).to.eq("x-terminal-emulator");
            expect(spawnArgs[1]).to.eql(["-e", "echo hello; bash"]);
        });

        it("should default to using gnome-terminal for gnome and launch", async () => {
            process.env.DESKTOP_SESSION = "gnome";
            const pid = await terminalService.runInTerminal("echo hello");
            expect(typeof pid).to.eq("number");
            expect(pid).to.eq(1234);
            expect(spawnSpy).to.have.been.calledOnce;
            const spawnArgs = spawnSpy.lastCall.args;
            expect(spawnArgs.length).to.eq(3);
            expect(spawnArgs[0]).to.eq("gnome-terminal");
            expect(spawnArgs[1]).to.eql(["-e", "echo hello; bash"]);
        });

        it("should default to using konsole for kde-plasma and launch", async () => {
            process.env.DESKTOP_SESSION = "kde-plasma";
            const pid = await terminalService.runInTerminal("echo hello");
            expect(typeof pid).to.eq("number");
            expect(pid).to.eq(1234);
            expect(spawnSpy).to.have.been.calledOnce;
            const spawnArgs = spawnSpy.lastCall.args;
            expect(spawnArgs.length).to.eq(3);
            expect(spawnArgs[0]).to.eq("konsole");
            expect(spawnArgs[1]).to.eql(["-e", "echo hello; bash"]);
        });

        it("should use the default colorterm if necessary and launch", async () => {
            process.env.COLORTERM = "xterm-256color";
            const pid = await terminalService.runInTerminal("echo hello");
            expect(typeof pid).to.eq("number");
            expect(pid).to.eq(1234);
            expect(spawnSpy).to.have.been.calledOnce;
            const spawnArgs = spawnSpy.lastCall.args;
            expect(spawnArgs.length).to.eq(3);
            expect(spawnArgs[0]).to.eq("xterm-256color");
            expect(spawnArgs[1]).to.eql(["-e", "echo hello; bash"]);
        });

        it("should default to using xterm if non-debian ubuntu and launch", async () => {
            delete process.env.COLORTERM;
            delete process.env.TERM;
            const pid = await terminalService.runInTerminal("echo hello");
            expect(typeof pid).to.eq("number");
            expect(pid).to.eq(1234);
            expect(spawnSpy).to.have.been.calledOnce;
            const spawnArgs = spawnSpy.lastCall.args;
            expect(spawnArgs.length).to.eq(3);
            expect(spawnArgs[0]).to.eq("xterm");
            expect(spawnArgs[1]).to.eql(["-e", "echo hello; bash"]);
        });
    });

    describe("when os is macOS", () => {
        beforeEach(() => {
            platform = Platform.OSX;
        });

        it("should default to using Terminal.app and launch in a new process", async () => {
            const pid = await terminalService.runInTerminal("echo hello");
            expect(typeof pid).to.eq("number");
            expect(pid).to.eq(1234);
            expect(spawnSpy).to.have.been.calledOnce;
            const spawnArgs = spawnSpy.lastCall.args;
            expect(spawnArgs.length).to.eq(3);
            expect(spawnArgs[0]).to.eq("osascript");
            expect(spawnArgs[1]).to.eql([
                "-e",
                'tell application "Terminal" to do script "echo hello"',
                "-e",
                'tell application "Terminal" to activate',
            ]);
        });
    });
});
import "sinon-chai";
