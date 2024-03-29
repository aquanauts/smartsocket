SHELL := $(shell which bash) # Use bash instead of bin/sh as shell
NODE_VERSION := 17.0.1
NODE_INSTALL := $(CURDIR)/.node-$(NODE_VERSION)
NODE := $(NODE_INSTALL)/bin/node
NPM := $(NODE_INSTALL)/bin/npm
PROJECT_NAME:=$(shell basename $(PWD))
DEPS := node_modules/.deps
CHROME_VERSION=94.0.4606.61
CHROME_ROOT=.chrome-$(CHROME_VERSION)
export PATH:=$(NODE_INSTALL)/bin:$(PATH):$(CHROME_ROOT)

help:
	@grep -E '^[0-9a-zA-Z_-]+:.*?## .*$$' $(MAKEFILE_LIST) | sort | awk 'BEGIN {FS = ":.*?## "}; {printf "\033[36m%-30s\033[0m %s\n", $$1, $$2}'

$(NODE_INSTALL):
	@echo Installing node $(NODE_VERSION)...
	@rm -rf $(NODE_INSTALL)
	@mkdir $(NODE_INSTALL)
	@curl -sL https://nodejs.org/dist/v$(NODE_VERSION)/node-v$(NODE_VERSION)-linux-x64.tar.xz | tar Jxf - -C $(NODE_INSTALL) --strip-components=1

$(CHROME_ROOT):
	@rm -rf $(CHROME_ROOT)
	@mkdir -p $(CHROME_ROOT)
	@wget http://chromedriver.storage.googleapis.com/$(CHROME_VERSION)/chromedriver_linux64.zip -O $(CHROME_ROOT)/chrome.zip
	@unzip -d $(CHROME_ROOT) $(CHROME_ROOT)/chrome.zip
	@rm $(CHROME_ROOT)/chrome.zip

$(NODE): $(NODE_INSTALL)
$(NPM): $(NODE_INSTALL)

$(DEPS): package.json | $(NPM) $(NODE) $(CHROME_ROOT)
	which node
	@$(NPM) install
	@cp $^ $(DEPS)

.PHONY: deps
deps: $(DEPS)

.PHONY: test
test: $(DEPS) ## Run tests in a headless chrome browser
	node_modules/karma/bin/karma start --single-run --no-auto-watch karma.conf.js

.PHONY: watch
watch: $(DEPS) ## Run tests continuously
	node_modules/karma/bin/karma start karma.conf.js

.PHONY: example
example: $(DEPS) ## Run an example application
	@cd example && $(NODE_INSTALL)/bin/node server.js

.PHONY: serve
serve: $(DEPS) ## Serve the browser test runner on localhost:8888 for debugging
	@find src spec | entr -cd $(NODE_INSTALL)/bin/npx jasmine-browser-runner serve
