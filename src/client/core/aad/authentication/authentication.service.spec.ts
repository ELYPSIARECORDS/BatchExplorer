import { AzureEnvironment } from "@batch-flask/core/azure-environment";
import { expect } from "chai";
import * as sinon from "sinon";
import { MockAuthenticationWindow, MockSplashScreen } from "test/utils/mocks/windows";
import {
    AuthenticationService, AuthenticationState, AuthorizeError, AuthorizeResult,
} from "./authentication.service";

describe("AuthenticationService", () => {
    let userAuthorization: AuthenticationService;
    let fakeAuthWindow: MockAuthenticationWindow;
    let appSpy;
    let state: AuthenticationState;
    beforeEach(() => {
        appSpy = {
            splashScreen: new MockSplashScreen(),
            authenticationWindow: new MockAuthenticationWindow(),
            azureEnvironment: AzureEnvironment.Azure,
        };
        const config = {
            tenant: "common",
            clientId: "abc",
            redirectUri: "http://localhost",
            logoutRedirectUri: "http://localhost",
        };
        userAuthorization = new AuthenticationService(appSpy, config);
        fakeAuthWindow = appSpy.authenticationWindow;
        userAuthorization.state.subscribe(x => state = x);
    });

    describe("Authorize", () => {
        let result: AuthorizeResult;
        let error: AuthorizeError;
        let promise;
        beforeEach(() => {
            result = null;
            error = null;
            const obs = userAuthorization.authorize("tenant-1");
            promise = obs.then((out) => result = out).catch((e) => error = e);
        });

        it("Should have called loadurl", () => {
            expect(fakeAuthWindow.loadURL).to.have.been.calledOnce;
            const args = fakeAuthWindow.loadURL.lastCall.args;
            expect(args.length).to.equal(1);
            const url = args[0];
            expect(url).to.contain("https://login.microsoftonline.com/tenant-1/oauth2/authorize");
            expect(url).to.contain("&resource=https://management.azure.com/");
            expect(url).to.contain("?response_type=id_token+code");
            expect(url).to.contain("&scope=user_impersonation+openid");
            expect(url).to.contain("&client_id=abc");
            expect(url).to.contain("&redirect_uri=http%3A%2F%2Flocalhost");
            expect(url).not.to.contain("&prompt=none");
        });

        it("window should be visible", () => {
            expect(fakeAuthWindow.isVisible()).to.equal(true);
        });

        it("state should now be UserInput", () => {
            expect(state).to.equal(AuthenticationState.UserInput);
        });

        it("Should return the id token and code when sucessfull", async () => {
            const newUrl = "http://localhost/#id_token=sometoken&code=somecode";
            fakeAuthWindow.notifyRedirect(newUrl);
            await promise;
            expect(result).not.to.be.null;
            expect(result.id_token).to.eql("sometoken");
            expect(result.code).to.eql("somecode");
            expect(error).to.be.null;

            expect(fakeAuthWindow.destroy).to.have.been.calledOnce;
            expect(state).to.equal(AuthenticationState.Authenticated);
        });

        it("Should error when the url redirect returns an error", async () => {
            const newUrl = "http://localhost/#error=someerror&error_description=There was an error";
            fakeAuthWindow.notifyRedirect(newUrl);
            await promise;

            expect(result).to.be.null;
            expect(error).not.to.be.null;
            expect(error.error).to.eql("someerror");
            expect(error.error_description).to.eql("There was an error");

            expect(fakeAuthWindow.destroy).to.have.been.calledOnce;
        });

        it("should only authorize 1 tenant at the time and queue the others", async () => {
            const obs1 = userAuthorization.authorize("tenant-1");
            const obs2 = userAuthorization.authorize("tenant-2");
            const tenant1Spy = sinon.fake();
            const tenant2Spy = sinon.fake();
            const p1 = obs1.then(tenant1Spy);
            const p2 = obs2.then(tenant2Spy);

            expect(tenant1Spy).not.to.have.been.called;
            expect(tenant2Spy).not.to.have.been.called;

            const newUrl1 = "http://localhost/#id_token=sometoken&code=somecode";
            fakeAuthWindow.notifyRedirect(newUrl1);
            await p1;

            // Should have set tenant-1
            expect(result).not.to.be.null;
            expect(result.id_token).to.eql("sometoken");
            expect(result.code).to.eql("somecode");

            expect(fakeAuthWindow.destroy).to.have.been.calledOnce;
            expect(tenant1Spy).to.have.been.called;
            expect(tenant1Spy).to.have.been.calledWith({ id_token: "sometoken", code: "somecode" });

            expect(tenant2Spy).not.to.have.been.called;

            // Should now authorize for tenant-2
            const newUrl2 = "http://localhost/#id_token=sometoken2&code=somecode2";
            fakeAuthWindow.notifyRedirect(newUrl2);
            await p2;

            expect(tenant2Spy).to.have.been.called;
            expect(tenant2Spy).to.have.been.calledWith({ id_token: "sometoken2", code: "somecode2" });
            expect(fakeAuthWindow.destroy).to.have.been.calledTwice;
        });
    });

    describe("Authorize silently", () => {
        beforeEach(() => {
            userAuthorization.authorize("tenant-1", true);
        });

        it("should set the prompt=none params", () => {
            const args = fakeAuthWindow.loadURL.lastCall.args;
            expect(args.length).to.equal(1);
            const url = args[0];
            expect(url).to.contain("&prompt=none");
        });

        it("shoud not be visible", () => {
            expect(fakeAuthWindow.isVisible()).to.equal(false);
        });
    });

    describe("Try Authorize silently first", () => {
        const goodResult: AuthorizeResult = { id_token: "sometoken", code: "somecode" } as any;
        const badResult: AuthorizeError = { error: "someerror", error_description: "There was an error" };

        let result: AuthorizeResult;
        let error: AuthorizeError;
        let callAuth: () => void;
        let authorizeOutput: sinon.SinonSpy;
        let promise;

        beforeEach(() => {
            result = null;
            error = null;
            callAuth = () => {
                const obs = userAuthorization.authorizeTrySilentFirst("tenant-1");
                promise = obs.then((out) => result = out).catch((e) => error = e);
            };
            userAuthorization.authorize = sinon.fake(() => {
                return authorizeOutput();
            });
        });

        it("Should not call silent false if silent true return sucessfully", async () => {
            authorizeOutput = sinon.fake.returns(Promise.resolve(goodResult));
            callAuth();
            await promise;
            expect(result).to.eql(goodResult);
            expect(error).to.be.null;

            expect(userAuthorization.authorize).to.have.been.calledOnce;
            expect(userAuthorization.authorize).to.have.been.calledWith("tenant-1", true);
        });

        it("Should call silent false if silent true return sucessfully", async () => {
            authorizeOutput = sinon.stub()
                .onCall(0).returns(Promise.reject(badResult))
                .onCall(1).returns(Promise.resolve(goodResult));
            callAuth();
            await promise;
            expect(result).to.eql(goodResult);
            expect(error).to.be.null;

            expect(userAuthorization.authorize).to.have.been.calledTwice;
            expect(userAuthorization.authorize).to.have.been.calledWith("tenant-1", true);
            expect(userAuthorization.authorize).to.have.been.calledWith("tenant-1", false);
        });

        it("Should return error if both silent true and false return an error", async () => {
            authorizeOutput = sinon.fake.returns(Promise.reject(badResult));
            callAuth();
            await promise;

            expect(userAuthorization.authorize).to.have.been.calledTwice;
            expect(result).to.be.null;
            expect(error).to.eql(badResult);
        });
    });
});
