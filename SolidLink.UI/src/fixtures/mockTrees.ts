export const mockTrees = [
  {
    key: 'mock-robot',
    label: 'Mock Robot',
    tree: {
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
    }
  },
  {
    key: 'mock-conveyor',
    label: 'Mock Conveyor Line',
    tree: {
      name: 'Mock Conveyor Line',
      rootFrame: {
        id: 'frame-line',
        name: 'Line',
        type: 'COMPONENT',
        referencePath: 'Line-1',
        localTransform: {
          position: [0, 0, 0],
          rotation: [0, 0, 0],
          matrix: [1, 0, 0, 0, 1, 0, 0, 0, 1, 0, 0, 0]
        },
        links: [],
        children: [
          {
            id: 'frame-infeed',
            name: 'Infeed',
            type: 'COMPONENT',
            referencePath: 'Infeed-1',
            localTransform: {
              position: [0, 0, 0],
              rotation: [0, 0, 0],
              matrix: [1, 0, 0, 0, 1, 0, 0, 0, 1, -0.5, 0, 0]
            },
            links: [
              {
                name: 'InfeedLink',
                visuals: [
                  {
                    type: 'mesh',
                    meshData: {
                      positions: [
                        0, 0, 0,
                        0.4, 0, 0,
                        0.4, 0.1, 0,
                        0, 0.1, 0
                      ],
                      indices: [0, 1, 2, 0, 2, 3]
                    },
                    color: [0.6, 0.7, 0.4]
                  }
                ]
              }
            ],
            children: [
              {
                id: 'frame-infeed-motor',
                name: 'Infeed Motor',
                type: 'COMPONENT',
                referencePath: 'InfeedMotor-1',
                localTransform: {
                  position: [0, 0, 0],
                  rotation: [0, 0, 0],
                  matrix: [1, 0, 0, 0, 1, 0, 0, 0, 1, -0.1, 0.15, 0]
                },
                links: [
                  {
                    name: 'InfeedMotorLink',
                    visuals: [
                      {
                        type: 'mesh',
                        meshData: {
                          positions: [
                            0, 0, 0,
                            0.1, 0, 0,
                            0.05, 0.08, 0
                          ],
                          indices: [0, 1, 2]
                        },
                        color: [0.7, 0.4, 0.4]
                      }
                    ]
                  }
                ],
                children: []
              }
            ]
          },
          {
            id: 'frame-transfer',
            name: 'Transfer',
            type: 'COMPONENT',
            referencePath: 'Transfer-1',
            localTransform: {
              position: [0, 0, 0],
              rotation: [0, 0, 0],
              matrix: [1, 0, 0, 0, 1, 0, 0, 0, 1, 0.2, 0, 0]
            },
            links: [
              {
                name: 'TransferLink',
                visuals: [
                  {
                    type: 'mesh',
                    meshData: {
                      positions: [
                        0, 0, 0,
                        0.3, 0, 0,
                        0.3, 0.12, 0,
                        0, 0.12, 0
                      ],
                      indices: [0, 1, 2, 0, 2, 3]
                    },
                    color: [0.4, 0.6, 0.8]
                  }
                ]
              }
            ],
            children: [
              {
                id: 'frame-transfer-sensor',
                name: 'Transfer Sensor',
                type: 'COMPONENT',
                referencePath: 'TransferSensor-1',
                localTransform: {
                  position: [0, 0, 0],
                  rotation: [0, 0, 0],
                  matrix: [1, 0, 0, 0, 1, 0, 0, 0, 1, 0.15, 0.18, 0]
                },
                links: [
                  {
                    name: 'TransferSensorLink',
                    visuals: [
                      {
                        type: 'mesh',
                        meshData: {
                          positions: [
                            0, 0, 0,
                            0.08, 0, 0,
                            0.04, 0.06, 0
                          ],
                          indices: [0, 1, 2]
                        },
                        color: [0.3, 0.8, 0.6]
                      }
                    ]
                  }
                ],
                children: []
              }
            ]
          },
          {
            id: 'frame-outfeed',
            name: 'Outfeed',
            type: 'COMPONENT',
            referencePath: 'Outfeed-1',
            localTransform: {
              position: [0, 0, 0],
              rotation: [0, 0, 0],
              matrix: [1, 0, 0, 0, 1, 0, 0, 0, 1, 0.7, 0, 0]
            },
            links: [
              {
                name: 'OutfeedLink',
                visuals: [
                  {
                    type: 'mesh',
                    meshData: {
                      positions: [
                        0, 0, 0,
                        0.4, 0, 0,
                        0.4, 0.1, 0,
                        0, 0.1, 0
                      ],
                      indices: [0, 1, 2, 0, 2, 3]
                    },
                    color: [0.8, 0.6, 0.4]
                  }
                ]
              }
            ],
            children: []
          }
        ]
      }
    }
  },
  {
    key: 'mock-plant',
    label: 'Mock Cell Layout',
    tree: {
      name: 'Mock Cell Layout',
      rootFrame: {
        id: 'frame-cell',
        name: 'Cell',
        type: 'COMPONENT',
        referencePath: 'Cell-1',
        localTransform: {
          position: [0, 0, 0],
          rotation: [0, 0, 0],
          matrix: [1, 0, 0, 0, 1, 0, 0, 0, 1, 0, 0, 0]
        },
        links: [],
        children: [
          {
            id: 'frame-robot-1',
            name: 'Robot A',
            type: 'COMPONENT',
            referencePath: 'RobotA-1',
            localTransform: {
              position: [0, 0, 0],
              rotation: [0, 0, 0],
              matrix: [1, 0, 0, 0, 1, 0, 0, 0, 1, -0.4, 0.2, 0]
            },
            links: [],
            children: [
              {
                id: 'frame-robot-a-base',
                name: 'Base',
                type: 'COMPONENT',
                referencePath: 'RobotA-Base-1',
                localTransform: {
                  position: [0, 0, 0],
                  rotation: [0, 0, 0],
                  matrix: [1, 0, 0, 0, 1, 0, 0, 0, 1, -0.4, 0.2, 0]
                },
                links: [
                  {
                    name: 'RobotABaseLink',
                    visuals: [
                      {
                        type: 'mesh',
                        meshData: {
                          positions: [
                            0, 0, 0,
                            0.25, 0, 0,
                            0.25, 0.25, 0,
                            0, 0.25, 0
                          ],
                          indices: [0, 1, 2, 0, 2, 3]
                        },
                        color: [0.5, 0.5, 0.5]
                      }
                    ]
                  }
                ],
                children: []
              },
              {
                id: 'frame-robot-a-arm',
                name: 'Arm',
                type: 'COMPONENT',
                referencePath: 'RobotA-Arm-1',
                localTransform: {
                  position: [0, 0, 0],
                  rotation: [0, 0, 0],
                  matrix: [1, 0, 0, 0, 1, 0, 0, 0, 1, -0.2, 0.35, 0.1]
                },
                links: [
                  {
                    name: 'RobotAArmLink',
                    visuals: [
                      {
                        type: 'mesh',
                        meshData: {
                          positions: [
                            0, 0, 0,
                            0.1, 0, 0,
                            0.05, 0.25, 0
                          ],
                          indices: [0, 1, 2]
                        },
                        color: [0.2, 0.4, 0.8]
                      }
                    ]
                  }
                ],
                children: [
                  {
                    id: 'frame-robot-a-gripper',
                    name: 'Gripper',
                    type: 'COMPONENT',
                    referencePath: 'RobotA-Gripper-1',
                    localTransform: {
                      position: [0, 0, 0],
                      rotation: [0, 0, 0],
                      matrix: [1, 0, 0, 0, 1, 0, 0, 0, 1, -0.15, 0.55, 0.15]
                    },
                    links: [
                      {
                        name: 'RobotAGripperLink',
                        visuals: [
                          {
                            type: 'mesh',
                            meshData: {
                              positions: [
                                0, 0, 0,
                                0.08, 0, 0,
                                0.04, 0.1, 0
                              ],
                              indices: [0, 1, 2]
                            },
                            color: [0.9, 0.5, 0.2]
                          }
                        ]
                      }
                    ],
                    children: []
                  }
                ]
              }
            ]
          },
          {
            id: 'frame-robot-2',
            name: 'Robot B',
            type: 'COMPONENT',
            referencePath: 'RobotB-1',
            localTransform: {
              position: [0, 0, 0],
              rotation: [0, 0, 0],
              matrix: [1, 0, 0, 0, 1, 0, 0, 0, 1, 0.4, -0.2, 0]
            },
            links: [],
            children: [
              {
                id: 'frame-robot-b-base',
                name: 'Base',
                type: 'COMPONENT',
                referencePath: 'RobotB-Base-1',
                localTransform: {
                  position: [0, 0, 0],
                  rotation: [0, 0, 0],
                  matrix: [1, 0, 0, 0, 1, 0, 0, 0, 1, 0.4, -0.2, 0]
                },
                links: [
                  {
                    name: 'RobotBBaseLink',
                    visuals: [
                      {
                        type: 'mesh',
                        meshData: {
                          positions: [
                            0, 0, 0,
                            0.2, 0, 0,
                            0.2, 0.2, 0,
                            0, 0.2, 0
                          ],
                          indices: [0, 1, 2, 0, 2, 3]
                        },
                        color: [0.4, 0.4, 0.6]
                      }
                    ]
                  }
                ],
                children: []
              },
              {
                id: 'frame-robot-b-arm',
                name: 'Arm',
                type: 'COMPONENT',
                referencePath: 'RobotB-Arm-1',
                localTransform: {
                  position: [0, 0, 0],
                  rotation: [0, 0, 0],
                  matrix: [1, 0, 0, 0, 1, 0, 0, 0, 1, 0.55, -0.05, 0.1]
                },
                links: [
                  {
                    name: 'RobotBArmLink',
                    visuals: [
                      {
                        type: 'mesh',
                        meshData: {
                          positions: [
                            0, 0, 0,
                            0.12, 0, 0,
                            0.06, 0.22, 0
                          ],
                          indices: [0, 1, 2]
                        },
                        color: [0.2, 0.7, 0.4]
                      }
                    ]
                  }
                ],
                children: []
              }
            ]
          },
          {
            id: 'frame-fixture',
            name: 'Fixture Table',
            type: 'COMPONENT',
            referencePath: 'Fixture-1',
            localTransform: {
              position: [0, 0, 0],
              rotation: [0, 0, 0],
              matrix: [1, 0, 0, 0, 1, 0, 0, 0, 1, 0, 0.4, 0]
            },
            links: [
              {
                name: 'FixtureLink',
                visuals: [
                  {
                    type: 'mesh',
                    meshData: {
                      positions: [
                        0, 0, 0,
                        0.6, 0, 0,
                        0.6, 0.2, 0,
                        0, 0.2, 0
                      ],
                      indices: [0, 1, 2, 0, 2, 3]
                    },
                    color: [0.7, 0.7, 0.7]
                  }
                ]
              }
            ],
            children: []
          }
        ]
      }
    }
  }
];
