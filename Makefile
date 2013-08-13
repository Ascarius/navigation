
build:
	uglifyjs -nc ./navigation.js > ./navigation.min.js

.PHONY: build
