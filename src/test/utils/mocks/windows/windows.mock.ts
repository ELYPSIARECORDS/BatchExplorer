import { Subject } from "rxjs";
import * as sinon from "sinon";

export class MockBrowserWindow {
    public destroy: sinon.SinonSpy;
    public loadURL: sinon.SinonSpy;
    public on: sinon.SinonSpy;
    public webContents: { on: sinon.SinonSpy, notify: (...args) => void };

    private _isVisible = false;
    private _events: { [key: string]: Subject<any> } = {};

    constructor() {
        this.destroy = sinon.fake();
        this.loadURL = sinon.fake();
        this.on = sinon.fake((event: string, callback: (...args) => void) => {
            if (!(event in this._events)) {
                this._events[event] = new Subject();
            }
            this._events[event].subscribe((data) => {
                callback(...data.args);
            });
        });
        this.webContents = {
            on: sinon.fake((event: string, callback: (...args) => void) => {
                this.on(`webcontents.${event}`, callback);
            }),
            notify: (event: string, data: any) => {
                this.notify(`webcontents.${event}`, data);
            },
        };
    }

    public isVisible() {
        return this._isVisible;
    }

    public isFullScreen() {
        return false;
    }

    public show() {
        this._isVisible = true;
    }

    public hide() {
        this._isVisible = false;
    }

    public notify(event: string, args: any[]) {
        if (event in this._events) {
            this._events[event].next({ args: args });
        }
    }
}

export class MockUniqueWindow {
    public create: sinon.SinonSpy;
    public show: sinon.SinonSpy;
    public hide: sinon.SinonSpy;
    public destroy: sinon.SinonSpy;
    private _visible: boolean = false;

    constructor() {
        this.create = sinon.fake();
        this.show = sinon.fake(() => this._visible = true);
        this.hide = sinon.fake(() => this._visible = false);
        this.destroy = sinon.fake();
    }

    public isVisible() {
        return this._visible;
    }
}

export class MockSplashScreen extends MockUniqueWindow {
}

export class MockAuthenticationWindow extends MockUniqueWindow {
    public loadURL: sinon.SinonSpy;
    private _onRedirectCallbacks = [];
    private _onNavigateCallbacks = [];
    private _onCloseCallbacks = [];

    constructor() {
        super();

        this.loadURL =  sinon.fake();
        this.destroy =  sinon.fake(() => {
            this._onRedirectCallbacks = [];
            this._onNavigateCallbacks = [];
            this._onCloseCallbacks = [];
        });
    }

    public onRedirect(callback) {
        this._onRedirectCallbacks.push(callback);
    }

    public onNavigate(callback) {
        this._onNavigateCallbacks.push(callback);
    }

    public onClose(callback) {
        this._onCloseCallbacks.push(callback);
    }

    public notifyRedirect(newUrl) {
        for (const callback of this._onRedirectCallbacks) {
            callback(newUrl);
        }
    }

    public notifyNavigate(newUrl) {
        for (const callback of this._onNavigateCallbacks) {
            callback(newUrl);
        }
    }

    public notifyClose() {
        for (const callback of this._onCloseCallbacks) {
            callback();
        }
    }
}
