export const mockTree = {
  name: 'Mock Robot',
  rootFrame: {
    id: 'frame-base',
    name: 'Base',
    type: 'COMPONENT',
    referencePath: 'Base-1',
    localTransform: {
      position: [0, 0, 0],
      rotation: [0, 0, 0],
      matrix: [1, 0, 0, 0, 1, 0, 0, 0, 1, 0, 0, 0]
    },
    links: [
      {
        name: 'BaseLink',
        visuals: [
          {
            type: 'mesh',
            meshData: {
              positions: [
                0, 0, 0,
                0.3, 0, 0,
                0.3, 0.3, 0,
                0, 0.3, 0
              ],
              indices: [0, 1, 2, 0, 2, 3]
            },
            color: [0.6, 0.6, 0.6]
          }
        ]
      }
    ],
    children: [
      {
        id: 'frame-arm',
        name: 'Arm',
        type: 'COMPONENT',
        referencePath: 'Arm-1',
        localTransform: {
          position: [0, 0, 0],
          rotation: [0, 0, 0],
          matrix: [1, 0, 0, 0, 1, 0, 0, 0, 1, 0.4, 0.0, 0.0]
        },
        links: [
          {
            name: 'ArmLink',
            visuals: [
              {
                type: 'mesh',
                meshData: {
                  positions: [
                    0, 0, 0,
                    0.2, 0, 0,
                    0.1, 0.4, 0
                  ],
                  indices: [0, 1, 2]
                },
                color: [0.2, 0.5, 0.9]
              }
            ]
          }
        ],
        children: [
          {
            id: 'frame-effector',
            name: 'End Effector',
            type: 'COMPONENT',
            referencePath: 'Effector-1',
            localTransform: {
              position: [0, 0, 0],
              rotation: [0, 0, 0],
              matrix: [1, 0, 0, 0, 1, 0, 0, 0, 1, 0.2, 0.35, 0.1]
            },
            links: [
              {
                name: 'EffectorLink',
                visuals: [
                  {
                    type: 'mesh',
                    meshData: {
                      positions: [
                        0, 0, 0,
                        0.1, 0, 0,
                        0.05, 0.1, 0.1
                      ],
                      indices: [0, 1, 2]
                    },
                    color: [0.9, 0.4, 0.2]
                  }
                ]
              }
            ],
            children: []
          }
        ]
      },
      {
        id: 'frame-sensor',
        name: 'Sensor Pod',
        type: 'COMPONENT',
        referencePath: 'Sensor-1',
        localTransform: {
          position: [0, 0, 0],
          rotation: [0, 0, 0],
          matrix: [1, 0, 0, 0, 1, 0, 0, 0, 1, -0.3, 0.2, 0.0]
        },
        links: [
          {
            name: 'SensorLink',
            visuals: [
              {
                type: 'mesh',
                meshData: {
                  positions: [
                    0, 0, 0,
                    0.15, 0, 0,
                    0.15, 0.15, 0,
                    0, 0.15, 0
                  ],
                  indices: [0, 1, 2, 0, 2, 3]
                },
                color: [0.3, 0.8, 0.5]
              }
            ]
          }
        ],
        children: []
      }
    ]
  }
};
