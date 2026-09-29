module.exports = {
	'/api/project': {
		get: {
			query: {
				type: 'object',
				properties: {
					proj_key: {
						type: 'string'
					}
				},
				required: ['proj_key']
			}
		}
	},
	'/api/project/list': {
		get: {
			query: {
				type: 'object',
				properties: {
					proj_key: {
						type: 'string',
					}
				}
			}
		}
	},
	'/api/project/model_list': {
		get: {}
	}
}